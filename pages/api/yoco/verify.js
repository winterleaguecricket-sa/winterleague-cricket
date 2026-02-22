// Yoco payment verification endpoint
// Called by the success page after Yoco redirects back to confirm payment
// SECURITY: Only marks orders as paid if Yoco API explicitly confirms payment
import { query } from '../../../lib/db';
import { getYocoConfig } from './config';
import { sendParentPaymentSuccessEmail } from '../../../lib/parentEmailHelper';
import { logPaymentEvent, logApiError } from '../../../lib/logger';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orderId } = req.body;

  if (!orderId) {
    return res.status(400).json({ success: false, error: 'Order ID is required' });
  }

  // Basic input validation — order IDs follow pattern ORD{timestamp} or ORD_ADDON_{timestamp}
  if (typeof orderId !== 'string' || orderId.length > 50 || !/^ORD[\w]*\d+$/.test(orderId)) {
    return res.status(400).json({ success: false, error: 'Invalid order ID format' });
  }

  try {
    // 1. Look up order in database
    const orderResult = await query(
      'SELECT id, order_number, total_amount, status, payment_status, payment_method, gateway_checkout_id, customer_email, customer_name FROM orders WHERE order_number = $1',
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      console.warn(`Yoco verify: order ${orderId} not found in database`);
      logPaymentEvent({ orderId, email: null, amount: null, gateway: 'yoco', status: 'verify_order_not_found', details: 'Order not found in database during verification' });
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // If already confirmed, return success immediately
    if (order.payment_status === 'paid') {
      return res.status(200).json({
        success: true,
        status: 'paid',
        message: 'Payment already confirmed'
      });
    }

    // SECURITY: We MUST have a gateway_checkout_id to verify with Yoco API
    // Without it, we cannot confirm payment — refuse to mark as paid
    if (!order.gateway_checkout_id) {
      console.warn(`Yoco verify: order ${orderId} has no gateway_checkout_id — cannot verify`);
      logPaymentEvent({ orderId, email: order.customer_email, amount: order.total_amount, gateway: 'yoco', status: 'verify_no_checkout_id', details: 'Order has no gateway_checkout_id — cannot verify with Yoco API' });
      return res.status(200).json({
        success: true,
        status: 'pending',
        message: 'Payment is being processed. Please allow a few minutes for confirmation.'
      });
    }

    // 2. Verify with Yoco API using the checkout ID
    const config = await getYocoConfig();

    if (!config.secretKey) {
      console.error('Yoco verify: no secret key configured — cannot verify payment');
      logPaymentEvent({ orderId, email: order.customer_email, amount: order.total_amount, gateway: 'yoco', status: 'verify_config_error', details: 'No Yoco secret key configured' });
      return res.status(200).json({
        success: true,
        status: 'pending',
        message: 'Payment is being processed. Please allow a few minutes for confirmation.'
      });
    }

    try {
      const yocoRes = await fetch(`https://payments.yoco.com/api/checkouts/${order.gateway_checkout_id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.secretKey}`
        }
      });

      if (yocoRes.ok) {
        const checkoutData = await yocoRes.json();
        console.log(`Yoco checkout ${order.gateway_checkout_id} status: ${checkoutData.status}`);

        if (checkoutData.status === 'completed') {
          // SECURITY: Verify amount matches before marking as paid
          const expectedCents = Math.round(parseFloat(order.total_amount) * 100);
          const yocoAmountCents = checkoutData.amount;
          
          if (yocoAmountCents && expectedCents !== yocoAmountCents) {
            console.error(`SECURITY: Amount mismatch for order ${orderId}: DB expects ${expectedCents} cents, Yoco reports ${yocoAmountCents} cents`);
            logPaymentEvent({ orderId, email: order.customer_email, amount: order.total_amount, gateway: 'yoco', status: 'verify_amount_mismatch', details: `SECURITY: DB expects ${expectedCents} cents, Yoco reports ${yocoAmountCents} cents` });
            logApiError({ method: 'POST', url: '/api/yoco/verify', statusCode: 200, error: `Amount mismatch: expected ${expectedCents}, got ${yocoAmountCents}`, body: { orderId } });
            return res.status(200).json({
              success: true,
              status: 'pending',
              message: 'Payment verification in progress. Please contact support if this persists.'
            });
          }

          // Payment confirmed by Yoco API — update order
          await query(
            `UPDATE orders SET 
              payment_status = 'paid',
              status = 'confirmed',
              payment_method = 'yoco',
              status_notes = $1,
              status_history = COALESCE(status_history, '[]'::jsonb) || $2::jsonb,
              updated_at = NOW()
            WHERE order_number = $3 AND payment_status != 'paid'`,
            [
              `Payment verified via Yoco API at ${new Date().toISOString()}`,
              JSON.stringify([{
                status: 'confirmed',
                payment_status: 'paid',
                timestamp: new Date().toISOString(),
                note: `Yoco checkout ${order.gateway_checkout_id} verified as completed (${yocoAmountCents} cents)`
              }]),
              orderId
            ]
          );

          console.log(`Order ${orderId} marked as PAID via Yoco API verification`);

          logPaymentEvent({ orderId, email: order.customer_email, amount: order.total_amount, gateway: 'yoco', status: 'paid', details: `Verified via Yoco API. Checkout ${order.gateway_checkout_id} completed (${yocoAmountCents} cents)` });

          // Mark team players as paid for this customer
          try {
            const playerUpdate = await query(
              `UPDATE team_players SET payment_status = 'paid'
               WHERE payment_status = 'pending_payment'
                 AND LOWER(player_email) = LOWER($1)`,
              [order.customer_email]
            );
            if (playerUpdate.rowCount > 0) {
              console.log(`Yoco verify: marked ${playerUpdate.rowCount} player(s) as paid for ${order.customer_email}`);
            }
          } catch (playerErr) {
            console.error('Yoco verify: failed to update team_players payment status:', playerErr.message);
          }

          // Mark team revenue entries as paid for this customer's players
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
              console.log(`Yoco verify: marked ${revenueUpdate.rowCount} revenue entry(s) as paid for ${order.customer_email}`);
            }
          } catch (revErr) {
            console.error('Yoco verify: failed to update team_revenue payment status:', revErr.message);
          }

          // Send parent payment success email (non-blocking)
          try {
            await sendParentPaymentSuccessEmail(
              orderId,
              order.customer_email || '',
              order.customer_name || '',
              order.total_amount
            );
          } catch (emailErr) {
            console.error('Parent payment email error (non-blocking):', emailErr.message);
          }

          return res.status(200).json({
            success: true,
            status: 'paid',
            message: 'Payment verified and confirmed'
          });
        } else {
          console.log(`Yoco checkout status is "${checkoutData.status}" — not yet completed`);
          return res.status(200).json({
            success: true,
            status: checkoutData.status,
            message: `Checkout status: ${checkoutData.status}`
          });
        }
      } else {
        const errorText = await yocoRes.text().catch(() => 'unknown');
        console.warn(`Yoco API returned ${yocoRes.status} for checkout ${order.gateway_checkout_id}: ${errorText}`);
      }
    } catch (apiErr) {
      console.error('Yoco API verification error:', apiErr.message);
      logApiError({ method: 'POST', url: '/api/yoco/verify', statusCode: 500, error: apiErr, body: { orderId, checkoutId: order.gateway_checkout_id } });
      logPaymentEvent({ orderId, email: order.customer_email, amount: order.total_amount, gateway: 'yoco', status: 'verify_api_error', details: `Yoco API error: ${apiErr.message}` });
    }

    // 3. If Yoco API call failed, do NOT mark as paid — return pending
    // SECURITY: Never trust the success redirect alone as proof of payment
    console.log(`Yoco verify: API check inconclusive for order ${orderId} — returning pending status`);
    logPaymentEvent({ orderId, email: order.customer_email, amount: order.total_amount, gateway: 'yoco', status: 'verify_inconclusive', details: 'Yoco API call did not return completed status — order remains pending' });
    return res.status(200).json({
      success: true,
      status: 'pending',
      message: 'Payment is being processed. Please allow a few minutes for confirmation.'
    });

  } catch (error) {
    console.error('Yoco verify error:', error);
    logApiError({ method: 'POST', url: '/api/yoco/verify', statusCode: 500, error, body: { orderId } });
    logPaymentEvent({ orderId, email: null, amount: null, gateway: 'yoco', status: 'verify_exception', details: error.message });
    return res.status(500).json({ success: false, error: 'Verification failed' });
  }
}
