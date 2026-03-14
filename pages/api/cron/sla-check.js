// SLA Monitoring Cron — checks for breached deadlines, records breaches, escalates, updates compliance rates
import { query } from '../../../lib/db';

const CRON_SECRET = 'wlc-sla-2026';

export default async function handler(req, res) {
  if (req.query.secret !== CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const now = new Date();
    let breachesCreated = 0;
    let warningsSent = 0;
    let suspensions = 0;

    // ─── 1. Find orders that have passed their acknowledge deadline ───
    const ackBreaches = await query(
      `SELECT so.id, so.supplier_id, so.order_number, so.sla_acknowledge_deadline
       FROM supplier_orders so
       WHERE so.fulfillment_status = 'pending'
         AND so.sla_acknowledge_deadline < $1
         AND so.sla_breached = false`,
      [now.toISOString()]
    );

    for (const order of ackBreaches.rows) {
      // Mark the order as breached
      await query(
        `UPDATE supplier_orders SET sla_breached = true, sla_breach_type = 'acknowledge', updated_at = NOW()
         WHERE id = $1`,
        [order.id]
      );

      // Record breach
      await query(
        `INSERT INTO supplier_sla_breaches (supplier_id, supplier_order_id, breach_type, deadline)
         VALUES ($1, $2, 'acknowledge', $3)`,
        [order.supplier_id, order.id, order.sla_acknowledge_deadline]
      );
      breachesCreated++;
    }

    // ─── 2. Find orders that have passed their ship deadline ──────────
    const shipBreaches = await query(
      `SELECT so.id, so.supplier_id, so.order_number, so.sla_ship_deadline
       FROM supplier_orders so
       WHERE so.fulfillment_status IN ('pending', 'acknowledged')
         AND so.sla_ship_deadline < $1
         AND (so.sla_breached = false OR so.sla_breach_type = 'acknowledge')`,
      [now.toISOString()]
    );

    for (const order of shipBreaches.rows) {
      await query(
        `UPDATE supplier_orders SET sla_breached = true, sla_breach_type = 'ship', updated_at = NOW()
         WHERE id = $1`,
        [order.id]
      );

      // Only record if we haven't already recorded a ship breach for this order
      const existingShip = await query(
        `SELECT id FROM supplier_sla_breaches WHERE supplier_order_id = $1 AND breach_type = 'ship' LIMIT 1`,
        [order.id]
      );
      if (existingShip.rows.length === 0) {
        await query(
          `INSERT INTO supplier_sla_breaches (supplier_id, supplier_order_id, breach_type, deadline)
           VALUES ($1, $2, 'ship', $3)`,
          [order.supplier_id, order.id, order.sla_ship_deadline]
        );
        breachesCreated++;
      }
    }

    // ─── 3. Escalation: check breach counts per supplier in rolling period ─
    const suppliers = await query(
      `SELECT DISTINCT s.id, s.sla_tier, s.company_name, s.active
       FROM suppliers s
       WHERE s.active = true`
    );

    for (const supplier of suppliers.rows) {
      // Get SLA config for this supplier's tier
      const configResult = await query(
        `SELECT breach_warning_threshold, breach_suspension_threshold, breach_penalty_rate, breach_period_days
         FROM supplier_sla_config WHERE tier = $1`,
        [supplier.sla_tier || 'standard']
      );
      const config = configResult.rows[0] || {
        breach_warning_threshold: 2, breach_suspension_threshold: 5,
        breach_penalty_rate: 5, breach_period_days: 30
      };

      // Count breaches in the rolling period
      const periodStart = new Date(now.getTime() - config.breach_period_days * 24 * 60 * 60 * 1000);
      const breachCount = await query(
        `SELECT COUNT(*)::int as count FROM supplier_sla_breaches
         WHERE supplier_id = $1 AND created_at >= $2`,
        [supplier.id, periodStart.toISOString()]
      );
      const count = breachCount.rows[0].count;

      // Suspension threshold
      if (count >= config.breach_suspension_threshold) {
        const alreadySuspended = await query(
          `SELECT id FROM supplier_sla_breaches
           WHERE supplier_id = $1 AND action_taken = 'suspension' AND created_at >= $2 LIMIT 1`,
          [supplier.id, periodStart.toISOString()]
        );
        if (alreadySuspended.rows.length === 0) {
          await query('UPDATE suppliers SET active = false WHERE id = $1', [supplier.id]);
          await query(
            `INSERT INTO supplier_sla_breaches (supplier_id, breach_type, deadline, action_taken, notes)
             VALUES ($1, 'suspension', NOW(), 'suspension', $2)`,
            [supplier.id, `Auto-suspended: ${count} breaches in ${config.breach_period_days} days (threshold: ${config.breach_suspension_threshold})`]
          );
          suspensions++;
          console.log(`[SLA] Supplier ${supplier.company_name} SUSPENDED — ${count} breaches`);
        }
      }
      // Warning threshold
      else if (count >= config.breach_warning_threshold) {
        const recentWarning = await query(
          `SELECT id FROM supplier_sla_breaches
           WHERE supplier_id = $1 AND action_taken = 'warning' AND created_at >= $2
           ORDER BY created_at DESC LIMIT 1`,
          [supplier.id, new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()]
        );
        if (recentWarning.rows.length === 0) {
          await query(
            `INSERT INTO supplier_sla_breaches (supplier_id, breach_type, deadline, action_taken, notes)
             VALUES ($1, 'warning', NOW(), 'warning', $2)`,
            [supplier.id, `Warning: ${count} breaches in ${config.breach_period_days} days (threshold: ${config.breach_warning_threshold})`]
          );
          warningsSent++;
          console.log(`[SLA] Supplier ${supplier.company_name} WARNING — ${count} breaches`);
        }
      }

      // ─── 4. Update compliance rate ─────────────────────────────────
      const totalOrders = await query(
        `SELECT COUNT(*)::int as total FROM supplier_orders WHERE supplier_id = $1`,
        [supplier.id]
      );
      const breachedOrders = await query(
        `SELECT COUNT(*)::int as breached FROM supplier_orders WHERE supplier_id = $1 AND sla_breached = true`,
        [supplier.id]
      );
      const total = totalOrders.rows[0].total;
      const breached = breachedOrders.rows[0].breached;
      const complianceRate = total > 0 ? ((total - breached) / total * 100).toFixed(2) : 100;

      await query(
        'UPDATE suppliers SET sla_compliance_rate = $1 WHERE id = $2',
        [complianceRate, supplier.id]
      );
    }

    console.log(`[SLA] Check complete — Breaches: ${breachesCreated}, Warnings: ${warningsSent}, Suspensions: ${suspensions}`);
    return res.json({
      success: true,
      breachesCreated,
      warningsSent,
      suspensions,
      checkedAt: now.toISOString()
    });
  } catch (err) {
    console.error('[SLA] Check error:', err.message);
    return res.status(500).json({ success: false, error: 'SLA check failed' });
  }
}
