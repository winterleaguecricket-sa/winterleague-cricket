// Yoco Webhook handler — receives payment notifications from Yoco
// SECURITY: Validates event structure, verifies amounts, prevents double-processing
import { query } from '../../../lib/db';
import { sendParentPaymentSuccessEmail } from '../../../lib/parentEmailHelper';
import { logPaymentEvent, logApiError } from '../../../lib/logger';

// Yoco sends JSON webhooks
export const config = {
  api: {
    bodyParser: true
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const event = req.body;
    const eventType = event.type;
    const payload = event.payload;

    console.log(`Yoco webhook received — type: ${eventType}, id: ${event.id || 'N/A'}`);

    logPaymentEvent({ orderId: event.payload?.metadata?.orderId || 'unknown', email: null, amount: null, gateway: 'yoco', status: 'webhook_received', details: `Event type: ${eventType}, Event ID: ${event.id || 'N/A'}` });

    // Basic event structure validation
    if (!eventType || typeof eventType !== 'string' || !payload || typeof payload !== 'object') {
      console.error('Yoco webhook: invalid event structure');
      logApiError({ method: 'POST', url: '/api/yoco/webhook', statusCode: 200, error: 'Invalid event structure from Yoco webhook', body: event });
      return res.status(200).json({ received: true });
    }

    // Extract order ID from metadata
    const orderId = payload.metadata?.orderId;

    if (!orderId || typeof orderId !== 'string' || !/^ORD\d+$/.test(orderId)) {
      console.log('Yoco webhook: missing or invalid orderId in metadata — skipping order update');
      return res.status(200).json({ received: true });
    }

    // Handle payment.succeeded event
    if (eventType === 'payment.succeeded') {
      const yocoPaymentId = payload.paymentId || payload.id || event.id || 'N/A';
      const amountInCents = payload.amount;
      const amountRands = amountInCents ? (amountInCents / 100).toFixed(2) : 'N/A';

      console.log(`Yoco payment succeeded — Order: ${orderId}, Amount: R${amountRands}, Payment ID: ${yocoPaymentId}`);

      // Verify order exists
      const orderResult = await query(
        'SELECT id, order_number, total_amount, status, payment_status, customer_email, customer_name FROM orders WHERE order_number = $1',
        [orderId]
      );

      if (orderResult.rows.length > 0) {
        const order = orderResult.rows[0];

        // SECURITY: Don't re-process already paid orders (idempotency)
        if (order.payment_status === 'paid') {
          console.log(`Yoco webhook: order ${orderId} already paid — skipping duplicate`);
          logPaymentEvent({ orderId, email: order.customer_email, amount: order.total_amount, gateway: 'yoco', status: 'webhook_duplicate', details: 'Order already paid — duplicate webhook skipped' });
          return res.status(200).json({ received: true });
        }

        // SECURITY: Verify amount matches
        if (amountInCents) {
          const expectedCents = Math.round(parseFloat(order.total_amount) * 100);
          if (expectedCents !== amountInCents) {
            console.error(`SECURITY: Yoco amount mismatch for ${orderId}: expected ${expectedCents} cents, got ${amountInCents} cents — NOT marking as paid`);
            logPaymentEvent({ orderId, email: order.customer_email, amount: order.total_amount, gateway: 'yoco', status: 'webhook_amount_mismatch', details: `SECURITY: expected ${expectedCents} cents, got ${amountInCents} cents` });
            logApiError({ method: 'POST', url: '/api/yoco/webhook', statusCode: 200, error: `Amount mismatch: expected ${expectedCents}, got ${amountInCents}`, body: { orderId, eventType } });
            return res.status(200).json({ received: true });
          }
        }

        // Update order to paid/confirmed (also store the Yoco payment ID for reconciliation)
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
            yocoPaymentId !== 'N/A' ? yocoPaymentId : null,
            `Payment confirmed via Yoco webhook at ${new Date().toISOString()}`,
            JSON.stringify([{
              status: 'confirmed',
              payment_status: 'paid',
              timestamp: new Date().toISOString(),
              note: `Yoco payment completed. Payment ID: ${yocoPaymentId}`
            }]),
            orderId
          ]
        );
        console.log(`Order ${orderId} marked as PAID and CONFIRMED via Yoco`);

        logPaymentEvent({ orderId, email: order.customer_email, amount: order.total_amount, gateway: 'yoco', status: 'paid', details: `Confirmed via Yoco webhook. Payment ID: ${yocoPaymentId}` });

        // Mark team players as paid for this customer
        try {
          const playerUpdate = await query(
            `UPDATE team_players SET payment_status = 'paid'
             WHERE payment_status = 'pending_payment'
               AND LOWER(player_email) = LOWER($1)`,
            [order.customer_email]
          );
          if (playerUpdate.rowCount > 0) {
            console.log(`Yoco webhook: marked ${playerUpdate.rowCount} player(s) as paid for ${order.customer_email}`);
          }
        } catch (playerErr) {
          console.error('Yoco webhook: failed to update team_players payment status:', playerErr.message);
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
            console.log(`Yoco webhook: marked ${revenueUpdate.rowCount} revenue entry(s) as paid for ${order.customer_email}`);
          }
        } catch (revErr) {
          console.error('Yoco webhook: failed to update team_revenue payment status:', revErr.message);
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
          console.error('Webhook: parent payment email error (non-blocking):', emailErr.message);
        }
      } else {
        console.warn(`Yoco webhook: order ${orderId} not found in database`);
        logPaymentEvent({ orderId, email: null, amount: null, gateway: 'yoco', status: 'webhook_order_not_found', details: 'Order not found in database during webhook processing' });
        logApiError({ method: 'POST', url: '/api/yoco/webhook', statusCode: 200, error: `Order ${orderId} not found in database`, body: { eventType, orderId } });
      }
    } else if (eventType === 'payment.failed' || eventType === 'checkout.expired') {
      console.log(`Yoco ${eventType} — Order: ${orderId}`);

      await query(
        `UPDATE orders SET 
          payment_status = 'cancelled',
          status = 'cancelled',
          status_notes = $1,
          status_history = COALESCE(status_history, '[]'::jsonb) || $2::jsonb,
          updated_at = NOW()
        WHERE order_number = $3 AND payment_status != 'paid'`,
        [
          `Payment ${eventType} via Yoco at ${new Date().toISOString()}`,
          JSON.stringify([{
            status: 'cancelled',
            payment_status: 'cancelled',
            timestamp: new Date().toISOString(),
            note: `Yoco: ${eventType}`
          }]),
          orderId
        ]
      );
      console.log(`Order ${orderId} marked as CANCELLED via Yoco`);

      logPaymentEvent({ orderId, email: null, amount: null, gateway: 'yoco', status: 'cancelled', details: `Order cancelled via Yoco webhook: ${eventType}` });
    } else {
      console.log(`Yoco webhook: unhandled event type "${eventType}" — no action taken`);
    }

    // Always return 200 to acknowledge receipt
    return res.status(200).json({ received: true });

  } catch (error) {
    console.error('Yoco webhook error:', error);
    logApiError({ method: 'POST', url: '/api/yoco/webhook', statusCode: 500, error, body: req.body });
    logPaymentEvent({ orderId: req.body?.payload?.metadata?.orderId || 'unknown', email: null, amount: null, gateway: 'yoco', status: 'webhook_exception', details: error.message });
    // Return 200 even on error to prevent Yoco from retrying indefinitely
    return res.status(200).json({ received: true, error: 'Internal processing error' });
  }
}
