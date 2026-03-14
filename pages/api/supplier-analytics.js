// Supplier Analytics API — Phase 10
import { query } from '../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { view } = req.query;

    // ─── Revenue Trends (last 30 days, daily) ──────────────
    if (view === 'revenue-trends') {
      const result = await query(`
        SELECT DATE(so.created_at) AS day,
               COUNT(*) AS order_count,
               COALESCE(SUM(so.supplier_amount), 0) AS supplier_revenue,
               COALESCE(SUM(so.admin_margin), 0) AS admin_revenue,
               COALESCE(SUM(so.subtotal), 0) AS gross_revenue
        FROM supplier_orders so
        WHERE so.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(so.created_at)
        ORDER BY day ASC
      `);
      return res.json({ success: true, trends: result.rows });
    }

    // ─── Top Suppliers ─────────────────────────────────────
    if (view === 'top-suppliers') {
      const result = await query(`
        SELECT s.id, s.company_name, s.performance_tier, s.rating,
               s.total_sales, s.total_revenue, s.sla_compliance_rate,
               s.active, s.featured,
               COUNT(DISTINCT so.id) AS recent_orders,
               COALESCE(SUM(so.supplier_amount), 0) AS recent_revenue
        FROM suppliers s
        LEFT JOIN supplier_orders so ON so.supplier_id = s.id AND so.created_at >= NOW() - INTERVAL '30 days'
        WHERE s.active = true
        GROUP BY s.id
        ORDER BY recent_revenue DESC
        LIMIT 10
      `);
      return res.json({ success: true, topSuppliers: result.rows });
    }

    // ─── Category Performance ─────────────────────────────
    if (view === 'category-performance') {
      const result = await query(`
        SELECT sp.category,
               COUNT(DISTINCT sp.id) AS product_count,
               COUNT(DISTINCT so.id) AS order_count,
               COALESCE(SUM(so.subtotal), 0) AS gross_revenue,
               COALESCE(SUM(so.supplier_amount), 0) AS supplier_revenue,
               COALESCE(SUM(so.admin_margin), 0) AS admin_margin
        FROM products sp
        LEFT JOIN supplier_orders so ON so.supplier_id = sp.supplier_id
        WHERE sp.approval_status = 'approved' AND sp.supplier_id IS NOT NULL
        GROUP BY sp.category
        ORDER BY gross_revenue DESC
      `);
      return res.json({ success: true, categories: result.rows });
    }

    // ─── Return Rate Analysis ──────────────────────────────
    if (view === 'return-analysis') {
      // Check table exists
      try {
        const returns = await query(`
          SELECT r.reason, COUNT(*) AS count,
                 COALESCE(SUM(r.refund_amount), 0) AS total_refund,
                 COUNT(CASE WHEN r.dispute_status = 'open' THEN 1 END) AS open_disputes,
                 COUNT(CASE WHEN r.sla_breached THEN 1 END) AS sla_breached
          FROM supplier_returns r
          GROUP BY r.reason
          ORDER BY count DESC
        `);
        const totals = await query(`
          SELECT COUNT(*) AS total_returns,
                 COALESCE(SUM(refund_amount), 0) AS total_refunded,
                 COUNT(CASE WHEN return_status = 'refunded' THEN 1 END) AS refunded_count,
                 COUNT(CASE WHEN dispute_status = 'open' THEN 1 END) AS open_disputes,
                 COUNT(CASE WHEN return_status = 'requested' THEN 1 END) AS pending_count
          FROM supplier_returns
        `);
        const orderCount = await query(`SELECT COUNT(*) AS total FROM supplier_orders`);
        return res.json({
          success: true,
          byReason: returns.rows,
          totals: totals.rows[0],
          totalOrders: parseInt(orderCount.rows[0]?.total || 0),
          returnRate: orderCount.rows[0]?.total > 0
            ? ((parseInt(totals.rows[0]?.total_returns || 0) / parseInt(orderCount.rows[0].total)) * 100).toFixed(1)
            : '0.0'
        });
      } catch {
        return res.json({ success: true, byReason: [], totals: { total_returns: 0 }, totalOrders: 0, returnRate: '0.0' });
      }
    }

    // ─── Activity Feed (recent events) ─────────────────────
    if (view === 'activity-feed') {
      const activities = [];

      // Recent orders (last 7 days)
      const orders = await query(`
        SELECT so.id, so.order_number, so.customer_name, so.fulfillment_status,
               so.supplier_amount, so.created_at, s.company_name
        FROM supplier_orders so
        JOIN suppliers s ON so.supplier_id = s.id
        ORDER BY so.created_at DESC LIMIT 10
      `);
      orders.rows.forEach(o => activities.push({
        type: 'order', id: o.id, time: o.created_at,
        text: `New order ${o.order_number} — ${o.customer_name} via ${o.company_name} (R${parseFloat(o.supplier_amount || 0).toFixed(2)})`,
        status: o.fulfillment_status
      }));

      // Recent applications
      const apps = await query(`
        SELECT id, company_name, status, created_at
        FROM supplier_applications ORDER BY created_at DESC LIMIT 5
      `);
      apps.rows.forEach(a => activities.push({
        type: 'application', id: a.id, time: a.created_at,
        text: `${a.company_name} — application ${a.status}`,
        status: a.status
      }));

      // Recent returns
      try {
        const returns = await query(`
          SELECT r.id, r.order_number, r.customer_name, r.return_status,
                 r.dispute_status, r.created_at, s.company_name
          FROM supplier_returns r
          JOIN suppliers s ON r.supplier_id = s.id
          ORDER BY r.created_at DESC LIMIT 5
        `);
        returns.rows.forEach(r => activities.push({
          type: 'return', id: r.id, time: r.created_at,
          text: `Return on ${r.order_number} — ${r.customer_name} (${r.company_name})${r.dispute_status === 'open' ? ' ⚡ DISPUTED' : ''}`,
          status: r.return_status
        }));
      } catch { /* table may not exist yet */ }

      // Sort by time descending
      activities.sort((a, b) => new Date(b.time) - new Date(a.time));
      return res.json({ success: true, activities: activities.slice(0, 20) });
    }

    // ─── Alerts ───────────────────────────────────────────
    if (view === 'alerts') {
      const alerts = [];

      // SLA breaches (unresolved)
      const slaBreach = await query(`
        SELECT COUNT(*) AS cnt FROM supplier_orders WHERE sla_breached = true AND fulfillment_status NOT IN ('delivered')
      `);
      if (parseInt(slaBreach.rows[0]?.cnt || 0) > 0) {
        alerts.push({ type: 'danger', icon: '🚨', text: `${slaBreach.rows[0].cnt} active SLA breach(es)` });
      }

      // Pending orders (not acknowledged > 12h)
      const overdueOrders = await query(`
        SELECT COUNT(*) AS cnt FROM supplier_orders
        WHERE fulfillment_status = 'pending' AND sla_acknowledge_deadline < NOW()
      `);
      if (parseInt(overdueOrders.rows[0]?.cnt || 0) > 0) {
        alerts.push({ type: 'warning', icon: '⏰', text: `${overdueOrders.rows[0].cnt} order(s) past acknowledge deadline` });
      }

      // Pending applications
      const pendingApps = await query(`
        SELECT COUNT(*) AS cnt FROM supplier_applications WHERE status IN ('submitted', 'under_review')
      `);
      if (parseInt(pendingApps.rows[0]?.cnt || 0) > 0) {
        alerts.push({ type: 'info', icon: '📋', text: `${pendingApps.rows[0].cnt} application(s) awaiting review` });
      }

      // Pending product approvals
      const pendingProducts = await query(`
        SELECT COUNT(*) AS cnt FROM products WHERE approval_status = 'pending' AND supplier_id IS NOT NULL
      `);
      if (parseInt(pendingProducts.rows[0]?.cnt || 0) > 0) {
        alerts.push({ type: 'info', icon: '🏷️', text: `${pendingProducts.rows[0].cnt} product(s) awaiting approval` });
      }

      // Open disputes
      try {
        const disputes = await query(`
          SELECT COUNT(*) AS cnt FROM supplier_returns WHERE dispute_status = 'open'
        `);
        if (parseInt(disputes.rows[0]?.cnt || 0) > 0) {
          alerts.push({ type: 'danger', icon: '⚡', text: `${disputes.rows[0].cnt} open dispute(s) need resolution` });
        }
      } catch { /* table may not exist */ }

      // Pending payouts
      const pendingPayouts = await query(`
        SELECT COUNT(*) AS cnt, COALESCE(SUM(net_payout), 0) AS amount FROM supplier_payouts WHERE status = 'pending'
      `);
      if (parseInt(pendingPayouts.rows[0]?.cnt || 0) > 0) {
        alerts.push({ type: 'warning', icon: '💸', text: `${pendingPayouts.rows[0].cnt} payout(s) pending (R${parseFloat(pendingPayouts.rows[0].amount).toFixed(2)})` });
      }

      return res.json({ success: true, alerts });
    }

    // ─── Summary Stats (quick overview) ────────────────────
    if (view === 'summary') {
      const [revenue30d, revenue7d, ordersToday] = await Promise.all([
        query(`SELECT COALESCE(SUM(subtotal), 0) AS total FROM supplier_orders WHERE created_at >= NOW() - INTERVAL '30 days'`),
        query(`SELECT COALESCE(SUM(subtotal), 0) AS total FROM supplier_orders WHERE created_at >= NOW() - INTERVAL '7 days'`),
        query(`SELECT COUNT(*) AS cnt FROM supplier_orders WHERE DATE(created_at) = CURRENT_DATE`),
      ]);
      return res.json({
        success: true,
        revenue30d: parseFloat(revenue30d.rows[0]?.total || 0),
        revenue7d: parseFloat(revenue7d.rows[0]?.total || 0),
        ordersToday: parseInt(ordersToday.rows[0]?.cnt || 0),
      });
    }

    // ─── CSV Export ────────────────────────────────────────
    if (view === 'export') {
      const { type } = req.query;

      if (type === 'orders') {
        const result = await query(`
          SELECT so.order_number, so.customer_name, so.customer_email,
                 so.fulfillment_status, so.subtotal, so.supplier_amount, so.admin_margin,
                 so.team_commission, so.shipping_tracking_number, so.shipping_courier,
                 so.sla_breached, so.payout_status, so.created_at, s.company_name AS supplier
          FROM supplier_orders so
          JOIN suppliers s ON so.supplier_id = s.id
          ORDER BY so.created_at DESC
        `);
        return sendCsv(res, 'supplier-orders', result.rows);
      }

      if (type === 'suppliers') {
        const result = await query(`
          SELECT company_name, email, contact_person_name, contact_person_phone,
                 sla_tier, performance_tier, rating, total_sales, total_revenue,
                 sla_compliance_rate, active, featured, created_at
          FROM suppliers
          ORDER BY company_name
        `);
        return sendCsv(res, 'suppliers', result.rows);
      }

      if (type === 'payouts') {
        const result = await query(`
          SELECT sp.id, s.company_name, sp.period_start, sp.period_end,
                 sp.gross_sales, sp.supplier_earnings, sp.sla_penalties,
                 sp.adjustments, sp.net_payout, sp.order_count, sp.status,
                 sp.payment_reference, sp.payment_method, sp.paid_at, sp.created_at
          FROM supplier_payouts sp
          JOIN suppliers s ON sp.supplier_id = s.id
          ORDER BY sp.created_at DESC
        `);
        return sendCsv(res, 'supplier-payouts', result.rows);
      }

      if (type === 'returns') {
        try {
          const result = await query(`
            SELECT r.order_number, r.customer_name, r.customer_email, r.reason,
                   r.reason_detail, r.return_status, r.refund_amount, r.supplier_response,
                   r.resolution, r.dispute_status, r.dispute_reason,
                   r.sla_breached, r.created_at, s.company_name AS supplier
            FROM supplier_returns r
            JOIN suppliers s ON r.supplier_id = s.id
            ORDER BY r.created_at DESC
          `);
          return sendCsv(res, 'supplier-returns', result.rows);
        } catch {
          return sendCsv(res, 'supplier-returns', []);
        }
      }

      if (type === 'products') {
        const result = await query(`
          SELECT sp.name, sp.category, sp.supplier_cost, sp.price AS sell_price,
                 sp.stock, sp.approval_status, sp.quality_rating,
                 sp.supplier_sku, sp.low_stock_threshold, sp.created_at,
                 s.company_name AS supplier
          FROM products sp
          JOIN suppliers s ON sp.supplier_id = s.id
          WHERE sp.supplier_id IS NOT NULL
          ORDER BY sp.created_at DESC
        `);
        return sendCsv(res, 'supplier-products', result.rows);
      }

      return res.status(400).json({ error: 'Invalid export type' });
    }

    return res.status(400).json({ error: 'Invalid view parameter' });
  } catch (err) {
    console.error('Analytics API error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

function sendCsv(res, filename, rows) {
  if (!rows || rows.length === 0) {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    return res.send('No data');
  }
  const headers = Object.keys(rows[0]);
  const csvRows = [headers.join(',')];
  for (const row of rows) {
    csvRows.push(headers.map(h => {
      let val = row[h];
      if (val === null || val === undefined) return '';
      if (typeof val === 'object') val = JSON.stringify(val);
      val = String(val).replace(/"/g, '""');
      return `"${val}"`;
    }).join(','));
  }
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
  return res.send(csvRows.join('\n'));
}
