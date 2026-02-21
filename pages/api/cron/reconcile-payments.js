// Automatic Payment Reconciliation
// Checks all pending Yoco orders against the Yoco API and auto-confirms paid ones
// Runs automatically every 5 minutes from server.js AND can be triggered manually from admin
//
// WHY THIS EXISTS:
// If the server restarts during a payment (e.g., PM2 restart during deployment),
// the Yoco success redirect and webhook both hit a dead server.
// This reconciler catches those orphaned payments by checking Yoco API directly.

import { query } from '../../../lib/db';
import { logPaymentEvent, logApiError } from '../../../lib/logger';
import { sendParentPaymentSuccessEmail } from '../../../lib/parentEmailHelper';

// Can also be called internally (not just via HTTP)
export async function reconcilePendingPayments() {
  const results = { checked: 0, confirmed: 0, expired: 0, errors: 0, details: [] };

  try {
    // Get Yoco config from DB
    const configResult = await query(
      "SELECT value FROM site_settings WHERE key = 'yoco_config'"
    );
    if (configResult.rows.length === 0 || !configResult.rows[0].value) {
      results.details.push('No Yoco config found in site_settings');
      return results;
    }

    let yocoConfig;
    try {
      yocoConfig = typeof configResult.rows[0].value === 'string'
        ? JSON.parse(configResult.rows[0].value)
        : configResult.rows[0].value;
    } catch (e) {
      results.details.push('Failed to parse Yoco config');
      return results;
    }

    if (!yocoConfig.secretKey) {
      results.details.push('No Yoco secret key configured');
      return results;
    }

    // Find all pending orders with a Yoco checkout ID (created in the last 48 hours)
    // These are orders where someone started a Yoco checkout but we never got confirmation
    const pendingOrders = await query(
      `SELECT id, order_number, total_amount, customer_email, customer_name, gateway_checkout_id, created_at
       FROM orders
       WHERE payment_status IN ('pending', 'pending_payment')
         AND gateway_checkout_id IS NOT NULL
         AND gateway_checkout_id != ''
         AND payment_method = 'yoco'
         AND created_at > NOW() - INTERVAL '48 hours'
       ORDER BY created_at DESC`
    );

    if (pendingOrders.rows.length === 0) {
      results.details.push('No pending Yoco orders to reconcile');
      return results;
    }

    console.log(`[RECONCILE] Found ${pendingOrders.rows.length} pending Yoco order(s) to check`);
    logPaymentEvent({
      orderId: 'SYSTEM',
      email: null,
      amount: null,
      gateway: 'yoco',
      status: 'reconcile_start',
      details: `Checking ${pendingOrders.rows.length} pending order(s)`
    });

    for (const order of pendingOrders.rows) {
      results.checked++;

      try {
        // Call Yoco API to check checkout status
        const yocoRes = await fetch(
          `https://payments.yoco.com/api/checkouts/${order.gateway_checkout_id}`,
          {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${yocoConfig.secretKey}` }
          }
        );

        if (!yocoRes.ok) {
          const errorText = await yocoRes.text().catch(() => 'unknown');
          console.warn(`[RECONCILE] Yoco API ${yocoRes.status} for ${order.order_number}: ${errorText}`);
          results.errors++;
          results.details.push(`${order.order_number}: Yoco API error ${yocoRes.status}`);
          continue;
        }

        const checkoutData = await yocoRes.json();
        console.log(`[RECONCILE] Order ${order.order_number} — Yoco status: ${checkoutData.status}`);

        if (checkoutData.status === 'completed') {
          // SECURITY: Verify amount matches
          const expectedCents = Math.round(parseFloat(order.total_amount) * 100);
          const yocoAmountCents = checkoutData.amount;

          if (yocoAmountCents && expectedCents !== yocoAmountCents) {
            console.error(`[RECONCILE] SECURITY: Amount mismatch for ${order.order_number}: DB=${expectedCents}, Yoco=${yocoAmountCents}`);
            logPaymentEvent({
              orderId: order.order_number,
              email: order.customer_email,
              amount: order.total_amount,
              gateway: 'yoco',
              status: 'reconcile_amount_mismatch',
              details: `SECURITY: DB expects ${expectedCents} cents, Yoco reports ${yocoAmountCents} cents`
            });
            results.errors++;
            results.details.push(`${order.order_number}: AMOUNT MISMATCH (DB=${expectedCents}, Yoco=${yocoAmountCents})`);
            continue;
          }

          // Payment confirmed by Yoco — auto-confirm the order!
          const paymentId = checkoutData.paymentId || checkoutData.payment?.id || 'N/A';

          await query(
            `UPDATE orders SET 
              payment_status = 'paid',
              status = 'confirmed',
              payment_method = 'yoco',
              gateway_payment_id = $1,
              status_notes = $2,
              status_history = COALESCE(status_history, '[]'::jsonb) || $3::jsonb,
              updated_at = NOW()
            WHERE order_number = $4 AND payment_status != 'paid'`,
            [
              paymentId !== 'N/A' ? paymentId : null,
              `Payment auto-confirmed via reconciliation at ${new Date().toISOString()} (Yoco checkout completed)`,
              JSON.stringify([{
                status: 'confirmed',
                payment_status: 'paid',
                timestamp: new Date().toISOString(),
                note: `Auto-reconciled: Yoco checkout ${order.gateway_checkout_id} confirmed as completed. Payment ID: ${paymentId}`
              }]),
              order.order_number
            ]
          );

          // Mark team players as paid
          try {
            const playerUpdate = await query(
              `UPDATE team_players SET payment_status = 'paid'
               WHERE payment_status = 'pending_payment'
                 AND LOWER(player_email) = LOWER($1)`,
              [order.customer_email]
            );
            if (playerUpdate.rowCount > 0) {
              console.log(`[RECONCILE] Marked ${playerUpdate.rowCount} player(s) as paid for ${order.customer_email}`);
            }
          } catch (playerErr) {
            console.error('[RECONCILE] Failed to update team_players:', playerErr.message);
          }

          // Mark team revenue entries as paid
          try {
            const revenueUpdate = await query(
              `UPDATE team_revenue tr SET payment_status = 'paid'
               FROM team_players tp
               WHERE tp.team_id = tr.team_id
                 AND tp.registration_data->>'formSubmissionId' = tr.reference_id
                 AND LOWER(tp.player_email) = LOWER($1)
                 AND tr.payment_status = 'pending_payment'`,
              [order.customer_email]
            );
            if (revenueUpdate.rowCount > 0) {
              console.log(`[RECONCILE] Marked ${revenueUpdate.rowCount} revenue entry(s) as paid for ${order.customer_email}`);
            }
          } catch (revErr) {
            console.error('[RECONCILE] Failed to update team_revenue:', revErr.message);
          }

          // Send parent payment success email (non-blocking)
          try {
            await sendParentPaymentSuccessEmail(
              order.order_number,
              order.customer_email || '',
              order.customer_name || '',
              order.total_amount
            );
          } catch (emailErr) {
            console.error('[RECONCILE] Email error (non-blocking):', emailErr.message);
          }

          console.log(`[RECONCILE] ✅ Order ${order.order_number} AUTO-CONFIRMED (was pending, Yoco says completed)`);
          logPaymentEvent({
            orderId: order.order_number,
            email: order.customer_email,
            amount: order.total_amount,
            gateway: 'yoco',
            status: 'auto_reconciled',
            details: `Payment auto-confirmed by reconciliation. Yoco checkout ${order.gateway_checkout_id} completed. Payment ID: ${paymentId}. Order was pending since ${order.created_at}`
          });

          results.confirmed++;
          results.details.push(`${order.order_number}: AUTO-CONFIRMED (R${order.total_amount}, ${order.customer_email})`);

        } else if (checkoutData.status === 'expired' || checkoutData.status === 'failed') {
          // Mark as cancelled — customer abandoned or payment failed
          await query(
            `UPDATE orders SET 
              payment_status = 'cancelled',
              status = 'cancelled',
              status_notes = $1,
              status_history = COALESCE(status_history, '[]'::jsonb) || $2::jsonb,
              updated_at = NOW()
            WHERE order_number = $3 AND payment_status != 'paid'`,
            [
              `Order auto-cancelled via reconciliation: Yoco checkout ${checkoutData.status} at ${new Date().toISOString()}`,
              JSON.stringify([{
                status: 'cancelled',
                payment_status: 'cancelled',
                timestamp: new Date().toISOString(),
                note: `Auto-reconciled: Yoco checkout ${checkoutData.status}`
              }]),
              order.order_number
            ]
          );

          console.log(`[RECONCILE] Order ${order.order_number} marked as CANCELLED (Yoco: ${checkoutData.status})`);
          logPaymentEvent({
            orderId: order.order_number,
            email: order.customer_email,
            amount: order.total_amount,
            gateway: 'yoco',
            status: 'auto_cancelled',
            details: `Yoco checkout ${checkoutData.status} — order auto-cancelled by reconciliation`
          });

          results.expired++;
          results.details.push(`${order.order_number}: CANCELLED (Yoco: ${checkoutData.status})`);

        } else {
          // Still processing or in unknown state
          results.details.push(`${order.order_number}: still ${checkoutData.status}`);
        }

      } catch (orderErr) {
        console.error(`[RECONCILE] Error checking order ${order.order_number}:`, orderErr.message);
        logApiError({
          method: 'CRON',
          url: '/api/cron/reconcile-payments',
          statusCode: 500,
          error: orderErr,
          body: { orderId: order.order_number, checkoutId: order.gateway_checkout_id }
        });
        results.errors++;
        results.details.push(`${order.order_number}: ERROR — ${orderErr.message}`);
      }
    }

    logPaymentEvent({
      orderId: 'SYSTEM',
      email: null,
      amount: null,
      gateway: 'yoco',
      status: 'reconcile_complete',
      details: `Checked: ${results.checked}, Confirmed: ${results.confirmed}, Expired: ${results.expired}, Errors: ${results.errors}`
    });

    console.log(`[RECONCILE] Done — Checked: ${results.checked}, Confirmed: ${results.confirmed}, Expired: ${results.expired}, Errors: ${results.errors}`);

  } catch (error) {
    console.error('[RECONCILE] Fatal error:', error);
    logApiError({
      method: 'CRON',
      url: '/api/cron/reconcile-payments',
      statusCode: 500,
      error
    });
    results.errors++;
    results.details.push(`Fatal error: ${error.message}`);
  }

  return results;
}

// HTTP handler — allows admin to trigger manually + scheduled calls
export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Allow both admin cookie auth and a simple secret token for cron calls
  const adminAuth = req.cookies?.winterleague_admin;
  const cronSecret = req.headers['x-cron-secret'] || req.query.secret;
  const isInternalCall = cronSecret === (process.env.CRON_SECRET || 'wlc-reconcile-2024');

  if (!adminAuth && !isInternalCall) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const results = await reconcilePendingPayments();

  return res.status(200).json({
    success: true,
    timestamp: new Date().toISOString(),
    ...results
  });
}
