// Supplier Payouts API — generate, list, detail, admin approve/pay
import { query } from '../../lib/db';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { supplierId, payoutId, action } = req.query;

      // ─── Single payout detail ───────────────────────────
      if (payoutId) {
        const p = await query(
          `SELECT sp.*, s.company_name, s.bank_name, s.bank_account_number, s.bank_branch_code, s.bank_account_type, s.bank_account_holder
           FROM supplier_payouts sp
           JOIN suppliers s ON s.id = sp.supplier_id
           WHERE sp.id = $1`,
          [payoutId]
        );
        if (!p.rows.length) return res.status(404).json({ error: 'Payout not found' });
        const payout = formatPayout(p.rows[0]);

        // Get orders included in this payout period
        const orders = await query(
          `SELECT id, order_number, fulfillment_status, supplier_amount, subtotal, items, created_at, delivered_at
           FROM supplier_orders
           WHERE supplier_id = $1 AND created_at >= $2 AND created_at <= $3
           ORDER BY created_at DESC`,
          [payout.supplierId, payout.periodStart, payout.periodEnd]
        );
        payout.orders = orders.rows.map(o => ({
          id: o.id, orderNumber: o.order_number, fulfillmentStatus: o.fulfillment_status,
          supplierAmount: parseFloat(o.supplier_amount || 0), subtotal: parseFloat(o.subtotal || 0),
          items: o.items || [], createdAt: o.created_at, deliveredAt: o.delivered_at
        }));
        return res.json({ success: true, payout });
      }

      // ─── Admin: list all payouts across suppliers ───────
      if (action === 'admin-list') {
        const payouts = await query(
          `SELECT sp.*, s.company_name, s.bank_name, s.bank_account_number, s.bank_branch_code, s.bank_account_type, s.bank_account_holder
           FROM supplier_payouts sp
           JOIN suppliers s ON s.id = sp.supplier_id
           ORDER BY sp.created_at DESC
           LIMIT 200`
        );

        // Admin summary stats
        const statsResult = await query(
          `SELECT 
             COUNT(*)::int as total,
             COUNT(*) FILTER (WHERE status = 'pending')::int as pending,
             COUNT(*) FILTER (WHERE status = 'processing')::int as processing,
             COUNT(*) FILTER (WHERE status = 'paid')::int as paid,
             COUNT(*) FILTER (WHERE status = 'failed')::int as failed,
             COALESCE(SUM(net_payout), 0) as total_amount,
             COALESCE(SUM(net_payout) FILTER (WHERE status = 'pending'), 0) as pending_amount,
             COALESCE(SUM(net_payout) FILTER (WHERE status = 'paid'), 0) as paid_amount
           FROM supplier_payouts`
        );

        return res.json({
          success: true,
          payouts: payouts.rows.map(formatPayout),
          stats: {
            total: statsResult.rows[0].total,
            pending: statsResult.rows[0].pending,
            processing: statsResult.rows[0].processing,
            paid: statsResult.rows[0].paid,
            failed: statsResult.rows[0].failed,
            totalAmount: parseFloat(statsResult.rows[0].total_amount),
            pendingAmount: parseFloat(statsResult.rows[0].pending_amount),
            paidAmount: parseFloat(statsResult.rows[0].paid_amount)
          }
        });
      }

      // ─── Supplier: list own payouts ─────────────────────
      if (!supplierId) return res.status(400).json({ error: 'supplierId required' });
      if (supplierId === 'admin') return res.json({ success: true, payouts: [], stats: { total: 0, pending: 0, processing: 0, paid: 0, failed: 0, totalEarnings: 0, pendingAmount: 0, paidAmount: 0 } });

      const payouts = await query(
        `SELECT * FROM supplier_payouts WHERE supplier_id = $1 ORDER BY period_end DESC LIMIT 100`,
        [supplierId]
      );

      // Stats for this supplier
      const statsResult = await query(
        `SELECT 
           COUNT(*)::int as total,
           COUNT(*) FILTER (WHERE status = 'pending')::int as pending,
           COUNT(*) FILTER (WHERE status = 'processing')::int as processing,
           COUNT(*) FILTER (WHERE status = 'paid')::int as paid,
           COUNT(*) FILTER (WHERE status = 'failed')::int as failed,
           COALESCE(SUM(net_payout), 0) as total_earnings,
           COALESCE(SUM(net_payout) FILTER (WHERE status = 'pending'), 0) as pending_amount,
           COALESCE(SUM(net_payout) FILTER (WHERE status = 'paid'), 0) as paid_amount
         FROM supplier_payouts WHERE supplier_id = $1`,
        [supplierId]
      );

      // Unpaid delivered orders (earnings not yet in a payout)
      const unpaid = await query(
        `SELECT COALESCE(SUM(supplier_amount), 0) as amount, COUNT(*)::int as count
         FROM supplier_orders
         WHERE supplier_id = $1 AND fulfillment_status = 'delivered' AND payout_status = 'pending'`,
        [supplierId]
      );

      return res.json({
        success: true,
        payouts: payouts.rows.map(formatPayout),
        stats: {
          total: statsResult.rows[0].total,
          pending: statsResult.rows[0].pending,
          processing: statsResult.rows[0].processing,
          paid: statsResult.rows[0].paid,
          failed: statsResult.rows[0].failed,
          totalEarnings: parseFloat(statsResult.rows[0].total_earnings),
          pendingAmount: parseFloat(statsResult.rows[0].pending_amount),
          paidAmount: parseFloat(statsResult.rows[0].paid_amount),
          unpaidAmount: parseFloat(unpaid.rows[0].amount),
          unpaidOrders: unpaid.rows[0].count
        }
      });
    }

    if (req.method === 'POST') {
      const { action } = req.body;

      // ─── Generate payout for a supplier ─────────────────
      if (action === 'generate') {
        const { supplierId, periodStart, periodEnd } = req.body;
        if (!supplierId || !periodStart || !periodEnd) {
          return res.status(400).json({ error: 'supplierId, periodStart, periodEnd required' });
        }

        // Get delivered orders in this period that have not been paid out
        const ordersInPeriod = await query(
          `SELECT id, supplier_amount, subtotal, sla_breached
           FROM supplier_orders
           WHERE supplier_id = $1
             AND fulfillment_status = 'delivered'
             AND payout_status = 'pending'
             AND created_at >= $2::date
             AND created_at <= ($3::date + interval '1 day')
           ORDER BY created_at`,
          [supplierId, periodStart, periodEnd]
        );

        if (!ordersInPeriod.rows.length) {
          return res.json({ success: false, error: 'No delivered unpaid orders in this period' });
        }

        const grossSales = ordersInPeriod.rows.reduce((s, o) => s + parseFloat(o.subtotal || 0), 0);
        const supplierEarnings = ordersInPeriod.rows.reduce((s, o) => s + parseFloat(o.supplier_amount || 0), 0);

        // SLA penalties: check for breaches in period
        const breachCount = ordersInPeriod.rows.filter(o => o.sla_breached).length;
        const configResult = await query(
          `SELECT breach_penalty_rate FROM supplier_sla_config WHERE tier = (SELECT COALESCE(sla_tier, 'standard') FROM suppliers WHERE id = $1)`,
          [supplierId]
        );
        const penaltyRate = configResult.rows[0]?.breach_penalty_rate || 5;
        const slaPenalties = breachCount > 0 ? (supplierEarnings * (penaltyRate / 100) * breachCount) : 0;

        const netPayout = supplierEarnings - slaPenalties;
        const orderCount = ordersInPeriod.rows.length;
        const orderIds = ordersInPeriod.rows.map(o => o.id);

        // Create the payout record
        const result = await query(
          `INSERT INTO supplier_payouts (supplier_id, period_start, period_end, gross_sales, supplier_earnings, adjustments, sla_penalties, net_payout, order_count, items, status)
           VALUES ($1, $2, $3, $4, $5, 0, $6, $7, $8, $9, 'pending')
           RETURNING id`,
          [supplierId, periodStart, periodEnd, grossSales, supplierEarnings, slaPenalties, netPayout, orderCount, JSON.stringify({ order_ids: orderIds })]
        );

        const payoutId = result.rows[0].id;

        // Mark orders as included in this payout
        await query(
          `UPDATE supplier_orders SET payout_status = 'processing', payout_id = $1, updated_at = NOW()
           WHERE id = ANY($2::uuid[])`,
          [payoutId, orderIds]
        );

        return res.json({ success: true, payoutId, netPayout, orderCount });
      }

      // ─── Admin: generate payouts for ALL due suppliers ──
      if (action === 'generate-all') {
        const { periodStart, periodEnd } = req.body;
        if (!periodStart || !periodEnd) {
          return res.status(400).json({ error: 'periodStart, periodEnd required' });
        }

        // Find all suppliers with delivered, unpaid orders in this period
        const suppliersWithOrders = await query(
          `SELECT DISTINCT supplier_id
           FROM supplier_orders
           WHERE fulfillment_status = 'delivered'
             AND payout_status = 'pending'
             AND created_at >= $1::date
             AND created_at <= ($2::date + interval '1 day')`,
          [periodStart, periodEnd]
        );

        let generated = 0;
        const results = [];

        for (const row of suppliersWithOrders.rows) {
          const sid = row.supplier_id;
          const ordersInPeriod = await query(
            `SELECT id, supplier_amount, subtotal, sla_breached FROM supplier_orders
             WHERE supplier_id = $1 AND fulfillment_status = 'delivered' AND payout_status = 'pending'
               AND created_at >= $2::date AND created_at <= ($3::date + interval '1 day')`,
            [sid, periodStart, periodEnd]
          );

          if (!ordersInPeriod.rows.length) continue;

          const grossSales = ordersInPeriod.rows.reduce((s, o) => s + parseFloat(o.subtotal || 0), 0);
          const supplierEarnings = ordersInPeriod.rows.reduce((s, o) => s + parseFloat(o.supplier_amount || 0), 0);
          const breachCount = ordersInPeriod.rows.filter(o => o.sla_breached).length;
          const configResult = await query(
            `SELECT breach_penalty_rate FROM supplier_sla_config WHERE tier = (SELECT COALESCE(sla_tier, 'standard') FROM suppliers WHERE id = $1)`,
            [sid]
          );
          const penaltyRate = configResult.rows[0]?.breach_penalty_rate || 5;
          const slaPenalties = breachCount > 0 ? (supplierEarnings * (penaltyRate / 100) * breachCount) : 0;
          const netPayout = supplierEarnings - slaPenalties;
          const orderIds = ordersInPeriod.rows.map(o => o.id);

          const result = await query(
            `INSERT INTO supplier_payouts (supplier_id, period_start, period_end, gross_sales, supplier_earnings, adjustments, sla_penalties, net_payout, order_count, items, status)
             VALUES ($1, $2, $3, $4, $5, 0, $6, $7, $8, $9, 'pending')
             RETURNING id`,
            [sid, periodStart, periodEnd, grossSales, supplierEarnings, slaPenalties, netPayout, ordersInPeriod.rows.length, JSON.stringify({ order_ids: orderIds })]
          );

          await query(
            `UPDATE supplier_orders SET payout_status = 'processing', payout_id = $1, updated_at = NOW()
             WHERE id = ANY($2::uuid[])`,
            [result.rows[0].id, orderIds]
          );

          results.push({ supplierId: sid, payoutId: result.rows[0].id, netPayout, orderCount: ordersInPeriod.rows.length });
          generated++;
        }

        return res.json({ success: true, generated, results });
      }

      // ─── Admin: mark payout as paid ─────────────────────
      if (action === 'mark-paid') {
        const { payoutId, paymentReference, paymentMethod } = req.body;
        if (!payoutId) return res.status(400).json({ error: 'payoutId required' });

        await query(
          `UPDATE supplier_payouts SET status = 'paid', payment_reference = $2, payment_method = $3, paid_at = NOW()
           WHERE id = $1`,
          [payoutId, paymentReference || '', paymentMethod || 'eft']
        );

        // Mark related orders as paid
        await query(
          `UPDATE supplier_orders SET payout_status = 'paid', updated_at = NOW()
           WHERE payout_id = $1`,
          [payoutId]
        );

        // Update supplier total_revenue
        const payout = await query('SELECT supplier_id, net_payout FROM supplier_payouts WHERE id = $1', [payoutId]);
        if (payout.rows.length) {
          await query(
            'UPDATE suppliers SET total_revenue = COALESCE(total_revenue, 0) + $1 WHERE id = $2',
            [payout.rows[0].net_payout, payout.rows[0].supplier_id]
          );
        }

        return res.json({ success: true });
      }

      // ─── Admin: mark payout as processing ───────────────
      if (action === 'mark-processing') {
        const { payoutId } = req.body;
        if (!payoutId) return res.status(400).json({ error: 'payoutId required' });
        await query(`UPDATE supplier_payouts SET status = 'processing' WHERE id = $1`, [payoutId]);
        return res.json({ success: true });
      }

      // ─── Admin: mark payout as failed ───────────────────
      if (action === 'mark-failed') {
        const { payoutId, adminNotes } = req.body;
        if (!payoutId) return res.status(400).json({ error: 'payoutId required' });
        await query(
          `UPDATE supplier_payouts SET status = 'failed', admin_notes = $2 WHERE id = $1`,
          [payoutId, adminNotes || '']
        );
        // Revert orders back to pending payout
        await query(
          `UPDATE supplier_orders SET payout_status = 'pending', payout_id = NULL, updated_at = NOW()
           WHERE payout_id = $1`,
          [payoutId]
        );
        return res.json({ success: true });
      }

      return res.status(400).json({ error: 'Unknown action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[Supplier Payouts] Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

function formatPayout(row) {
  return {
    id: row.id,
    supplierId: row.supplier_id,
    companyName: row.company_name,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    grossSales: parseFloat(row.gross_sales || 0),
    supplierEarnings: parseFloat(row.supplier_earnings || 0),
    adjustments: parseFloat(row.adjustments || 0),
    slaPenalties: parseFloat(row.sla_penalties || 0),
    netPayout: parseFloat(row.net_payout || 0),
    orderCount: row.order_count || 0,
    items: row.items,
    status: row.status,
    paymentReference: row.payment_reference,
    paymentMethod: row.payment_method,
    paidAt: row.paid_at,
    adminNotes: row.admin_notes,
    createdAt: row.created_at,
    bankName: row.bank_name,
    bankAccountNumber: row.bank_account_number,
    bankBranchCode: row.bank_branch_code,
    bankAccountType: row.bank_account_type,
    bankAccountHolder: row.bank_account_holder
  };
}
