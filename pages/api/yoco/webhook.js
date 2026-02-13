// Yoco Webhook handler — receives payment notifications from Yoco
import crypto from 'crypto';
import { query } from '../../../lib/db';
import { getYocoConfig } from './config';

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

    if (!eventType || !payload) {
      console.error('Yoco webhook: missing type or payload');
      return res.status(200).json({ received: true });
    }

    // Extract order ID from metadata
    const orderId = payload.metadata?.orderId;

    if (!orderId) {
      console.log('Yoco webhook: no orderId in metadata — skipping order update');
      return res.status(200).json({ received: true });
    }

    // Handle checkout.completed event
    if (eventType === 'payment.succeeded') {
      const yocoPaymentId = payload.paymentId || payload.id || event.id || 'N/A';
      const amountInCents = payload.amount;
      const amountRands = amountInCents ? (amountInCents / 100).toFixed(2) : 'N/A';

      console.log(`Yoco payment succeeded — Order: ${orderId}, Amount: R${amountRands}, Payment ID: ${yocoPaymentId}`);

      // Verify order exists
      const orderResult = await query(
        'SELECT id, order_number, total_amount, status, payment_status FROM orders WHERE order_number = $1',
        [orderId]
      );

      if (orderResult.rows.length > 0) {
        const order = orderResult.rows[0];

        // Optional: verify amount
        if (amountInCents) {
          const expectedCents = Math.round(parseFloat(order.total_amount) * 100);
          if (expectedCents !== amountInCents) {
            console.warn(`Yoco amount mismatch for ${orderId}: expected ${expectedCents} cents, got ${amountInCents} cents`);
          }
        }

        // Update order to paid/confirmed
        await query(
          `UPDATE orders SET 
            payment_status = 'paid',
            status = 'confirmed',
            payment_method = 'yoco',
            status_notes = $1,
            status_history = COALESCE(status_history, '[]'::jsonb) || $2::jsonb,
            updated_at = NOW()
          WHERE order_number = $3`,
          [
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
      } else {
        console.warn(`Yoco webhook: order ${orderId} not found in database`);
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
        WHERE order_number = $3`,
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
    } else {
      console.log(`Yoco webhook: unhandled event type "${eventType}" — no action taken`);
    }

    // Always return 200 to acknowledge receipt
    return res.status(200).json({ received: true });

  } catch (error) {
    console.error('Yoco webhook error:', error);
    // Return 200 even on error to prevent Yoco from retrying indefinitely
    return res.status(200).json({ received: true, error: 'Internal processing error' });
  }
}
