// Supplier Orders API — handles splitting paid orders into supplier_orders + supplier order management
import { query } from '../../lib/db';

/**
 * Split a confirmed order into supplier_orders rows for any items belonging to suppliers.
 * Called after payment confirmation (webhook/verify).
 * Idempotent: skips if supplier_orders already exist for this order.
 */
export async function splitOrderForSuppliers(orderId, orderNumber) {
  try {
    // Check if already split
    const existing = await query('SELECT id FROM supplier_orders WHERE order_number = $1 LIMIT 1', [orderNumber]);
    if (existing.rows.length > 0) return; // already processed

    // Get the order
    const orderResult = await query('SELECT * FROM orders WHERE order_number = $1', [orderNumber]);
    if (orderResult.rows.length === 0) return;
    const order = orderResult.rows[0];

    const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
    if (items.length === 0) return;

    // Get ALL product IDs from items and look up supplier info
    const productIds = items.map(i => parseInt(i.id)).filter(id => !isNaN(id));
    if (productIds.length === 0) return;

    const productsResult = await query(
      `SELECT id, supplier_id, supplier_cost, price FROM products WHERE id = ANY($1) AND supplier_id IS NOT NULL`,
      [productIds]
    );

    if (productsResult.rows.length === 0) return; // no supplier products in this order

    // Build a map of product id → supplier info
    const productMap = {};
    productsResult.rows.forEach(p => { productMap[p.id] = p; });

    // Group items by supplier_id
    const supplierGroups = {};
    for (const item of items) {
      const product = productMap[parseInt(item.id)];
      if (!product) continue; // not a supplier product

      const sid = product.supplier_id;
      if (!supplierGroups[sid]) supplierGroups[sid] = { items: [], subtotal: 0, supplierAmount: 0, adminMargin: 0 };

      const qty = parseInt(item.quantity) || 1;
      const sellPrice = parseFloat(product.price) || parseFloat(item.price) || 0;
      const costPrice = parseFloat(product.supplier_cost) || 0;
      const lineTotal = sellPrice * qty;
      const supplierTotal = costPrice * qty;
      const margin = lineTotal - supplierTotal;

      supplierGroups[sid].items.push({
        productId: product.id,
        name: item.name,
        quantity: qty,
        selectedSize: item.selectedSize || null,
        sellPrice,
        costPrice,
        lineTotal,
        supplierTotal
      });
      supplierGroups[sid].subtotal += lineTotal;
      supplierGroups[sid].supplierAmount += supplierTotal;
      supplierGroups[sid].adminMargin += margin;
    }

    // Get SLA config for deadline calculations
    const slaResult = await query(
      `SELECT supplier_id, acknowledge_hours, ship_days FROM supplier_sla_config WHERE supplier_id = ANY($1)`,
      [Object.keys(supplierGroups)]
    );
    const slaMap = {};
    slaResult.rows.forEach(s => { slaMap[s.supplier_id] = s; });

    // Calculate team commission (10% of subtotal) — find team from customer
    let teamId = null;
    let teamCommissionRate = 0.10;
    if (order.customer_email) {
      const custResult = await query(
        `SELECT team_id FROM customers WHERE LOWER(email) = LOWER($1) AND team_id IS NOT NULL LIMIT 1`,
        [order.customer_email]
      );
      if (custResult.rows.length > 0) teamId = custResult.rows[0].team_id;
    }

    const platformFeeRate = 2.93; // Yoco fee percentage

    // Insert supplier_orders
    for (const [supplierId, group] of Object.entries(supplierGroups)) {
      const sla = slaMap[supplierId] || { acknowledge_hours: 24, ship_days: 3 };
      const now = new Date();
      const ackDeadline = new Date(now.getTime() + (sla.acknowledge_hours || 24) * 60 * 60 * 1000);
      const shipDeadline = new Date(now.getTime() + (sla.ship_days || 3) * 24 * 60 * 60 * 1000);

      const teamCommission = teamId ? group.subtotal * teamCommissionRate : 0;
      const platformFee = group.subtotal * (platformFeeRate / 100);
      const netAdmin = group.adminMargin - teamCommission - platformFee;

      await query(
        `INSERT INTO supplier_orders 
          (order_id, order_number, supplier_id, customer_name, customer_email, team_id,
           items, subtotal, supplier_amount, admin_margin, team_commission,
           platform_fee_rate, net_admin_amount,
           sla_acknowledge_deadline, sla_ship_deadline)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          order.id, orderNumber, supplierId,
          order.customer_name, order.customer_email, teamId,
          JSON.stringify(group.items), group.subtotal, group.supplierAmount,
          group.adminMargin, teamCommission, platformFeeRate,
          netAdmin > 0 ? netAdmin : 0,
          ackDeadline.toISOString(), shipDeadline.toISOString()
        ]
      );

      // Update product total_sold counters
      for (const item of group.items) {
        await query(
          'UPDATE products SET total_sold = COALESCE(total_sold, 0) + $1, stock = GREATEST(stock - $1, 0) WHERE id = $2',
          [item.quantity, item.productId]
        );
      }

      console.log(`Supplier order created for supplier ${supplierId} from order ${orderNumber}: R${group.subtotal} (supplier gets R${group.supplierAmount})`);
    }

    // Record team commission revenue if applicable
    if (teamId) {
      let totalTeamCommission = 0;
      for (const group of Object.values(supplierGroups)) {
        totalTeamCommission += group.subtotal * teamCommissionRate;
      }
      if (totalTeamCommission > 0) {
        await query(
          `INSERT INTO team_revenue (team_id, revenue_type, amount, description, reference_id, payment_status)
           VALUES ($1, 'product-commission', $2, $3, $4, 'paid')`,
          [teamId, totalTeamCommission, `10% commission on supplier products from order ${orderNumber}`, orderNumber]
        );
        console.log(`Team ${teamId} earned R${totalTeamCommission.toFixed(2)} commission from order ${orderNumber}`);
      }
    }
  } catch (err) {
    console.error('Supplier order splitting error:', err.message);
  }
}

/**
 * API handler — supplier views/manages their orders
 */
export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { supplierId, status, orderId } = req.query;
      if (!supplierId) return res.status(400).json({ success: false, error: 'supplierId required' });
      if (supplierId === 'admin') return res.json({ success: true, orders: [], stats: { total: 0, pending: 0, acknowledged: 0, shipped: 0, delivered: 0 } });

      // Single order detail
      if (orderId) {
        const result = await query(
          `SELECT so.*, s.company_name FROM supplier_orders so
           JOIN suppliers s ON s.id = so.supplier_id
           WHERE so.id = $1 AND so.supplier_id = $2`,
          [orderId, supplierId]
        );
        if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Order not found' });
        const o = result.rows[0];
        return res.json({ success: true, order: formatOrder(o) });
      }

      // List orders
      let sql = `SELECT so.* FROM supplier_orders so WHERE so.supplier_id = $1`;
      const params = [supplierId];
      if (status && ['pending', 'acknowledged', 'shipped', 'delivered'].includes(status)) {
        sql += ` AND so.fulfillment_status = $2`;
        params.push(status);
      }
      sql += ' ORDER BY so.created_at DESC';

      const result = await query(sql, params);
      const orders = result.rows.map(formatOrder);

      // Stats
      const statsResult = await query(
        `SELECT fulfillment_status, COUNT(*)::int as count, SUM(supplier_amount)::numeric as total
         FROM supplier_orders WHERE supplier_id = $1 GROUP BY fulfillment_status`,
        [supplierId]
      );
      const stats = { total: 0, pending: 0, acknowledged: 0, shipped: 0, delivered: 0, totalEarnings: 0 };
      statsResult.rows.forEach(r => {
        stats[r.fulfillment_status] = r.count;
        stats.total += r.count;
        if (r.fulfillment_status === 'delivered') stats.totalEarnings += parseFloat(r.total || 0);
      });

      return res.json({ success: true, orders, stats });
    }

    if (req.method === 'POST') {
      const { action, supplierId, orderId } = req.body;
      if (!supplierId || !orderId) return res.status(400).json({ success: false, error: 'supplierId and orderId required' });

      // Verify ownership
      const orderCheck = await query(
        'SELECT * FROM supplier_orders WHERE id = $1 AND supplier_id = $2',
        [orderId, supplierId]
      );
      if (orderCheck.rows.length === 0) return res.status(404).json({ success: false, error: 'Order not found' });
      const order = orderCheck.rows[0];

      if (action === 'acknowledge') {
        if (order.fulfillment_status !== 'pending') {
          return res.status(400).json({ success: false, error: 'Order already acknowledged' });
        }
        await query(
          `UPDATE supplier_orders SET fulfillment_status = 'acknowledged', acknowledged_at = NOW(), updated_at = NOW()
           WHERE id = $1 AND supplier_id = $2`,
          [orderId, supplierId]
        );
        return res.json({ success: true, message: 'Order acknowledged' });
      }

      if (action === 'ship') {
        const { trackingNumber, courier } = req.body;
        if (!['pending', 'acknowledged'].includes(order.fulfillment_status)) {
          return res.status(400).json({ success: false, error: 'Order already shipped' });
        }
        await query(
          `UPDATE supplier_orders SET fulfillment_status = 'shipped', shipped_at = NOW(),
           shipping_tracking_number = $3, shipping_courier = $4,
           acknowledged_at = COALESCE(acknowledged_at, NOW()), updated_at = NOW()
           WHERE id = $1 AND supplier_id = $2`,
          [orderId, supplierId, (trackingNumber || '').trim(), (courier || '').trim()]
        );
        return res.json({ success: true, message: 'Order marked as shipped' });
      }

      if (action === 'deliver') {
        if (order.fulfillment_status === 'delivered') {
          return res.status(400).json({ success: false, error: 'Order already delivered' });
        }
        await query(
          `UPDATE supplier_orders SET fulfillment_status = 'delivered', delivered_at = NOW(), updated_at = NOW()
           WHERE id = $1 AND supplier_id = $2`,
          [orderId, supplierId]
        );
        return res.json({ success: true, message: 'Order marked as delivered' });
      }

      return res.status(400).json({ success: false, error: 'Invalid action' });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    console.error('Supplier orders API error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}

function formatOrder(row) {
  return {
    id: row.id,
    orderId: row.order_id,
    orderNumber: row.order_number,
    customerName: row.customer_name || '',
    customerEmail: row.customer_email || '',
    items: typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || []),
    subtotal: parseFloat(row.subtotal || 0),
    supplierAmount: parseFloat(row.supplier_amount || 0),
    adminMargin: parseFloat(row.admin_margin || 0),
    teamCommission: parseFloat(row.team_commission || 0),
    fulfillmentStatus: row.fulfillment_status || 'pending',
    acknowledgedAt: row.acknowledged_at,
    shippedAt: row.shipped_at,
    deliveredAt: row.delivered_at,
    trackingNumber: row.shipping_tracking_number || '',
    courier: row.shipping_courier || '',
    slaAckDeadline: row.sla_acknowledge_deadline,
    slaShipDeadline: row.sla_ship_deadline,
    slaBreached: row.sla_breached || false,
    payoutStatus: row.payout_status || 'pending',
    createdAt: row.created_at
  };
}
