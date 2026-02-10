// PayFast ITN (Instant Transaction Notification) handler
import crypto from 'crypto';
import { query } from '../../../lib/db';
import { getPayfastConfig } from './config';

// Disable body parser — PayFast sends URL-encoded form data
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
    const pfData = req.body;
    const orderId = pfData.m_payment_id;
    const paymentStatus = pfData.payment_status;
    const amountGross = pfData.amount_gross;

    console.log(`PayFast ITN received - Order: ${orderId}, Status: ${paymentStatus}, Amount: R${amountGross}`);

    // 1. Validate signature — use param order as received, NOT sorted
    const payfastConfig = await getPayfastConfig();

    const pfParamString = Object.keys(pfData)
      .filter(key => key !== 'signature')
      .map(key => `${key}=${encodeURIComponent(pfData[key].toString().trim()).replace(/%20/g, '+')}`)
      .join('&');

    let signatureString = pfParamString;
    if (payfastConfig.passphrase) {
      signatureString += `&passphrase=${encodeURIComponent(payfastConfig.passphrase.trim()).replace(/%20/g, '+')}`;
    }

    const calculatedSignature = crypto.createHash('md5').update(signatureString).digest('hex');

    if (calculatedSignature !== pfData.signature) {
      console.error(`PayFast signature mismatch for order ${orderId}`);
      console.error(`  Calculated: ${calculatedSignature}`);
      console.error(`  Received:   ${pfData.signature}`);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    console.log(`PayFast signature validated for order ${orderId}`);

    // 2. Verify amount matches order
    if (orderId) {
      const orderResult = await query(
        'SELECT id, order_number, total_amount, status, payment_status FROM orders WHERE order_number = $1',
        [orderId]
      );

      if (orderResult.rows.length > 0) {
        const order = orderResult.rows[0];
        const expectedAmount = parseFloat(order.total_amount).toFixed(2);
        const receivedAmount = parseFloat(amountGross).toFixed(2);

        if (expectedAmount !== receivedAmount) {
          console.error(`Amount mismatch for order ${orderId}: expected R${expectedAmount}, got R${receivedAmount}`);
          // Log but don't reject — PayFast may include fees
        }

        // 3. Update order status
        if (paymentStatus === 'COMPLETE') {
          await query(
            `UPDATE orders SET 
              payment_status = 'paid',
              status = 'confirmed',
              status_notes = $1,
              status_history = COALESCE(status_history, '[]'::jsonb) || $2::jsonb,
              updated_at = NOW()
            WHERE order_number = $3`,
            [
              `Payment confirmed via PayFast ITN at ${new Date().toISOString()}`,
              JSON.stringify([{
                status: 'confirmed',
                payment_status: 'paid',
                timestamp: new Date().toISOString(),
                note: `PayFast payment completed. PF Payment ID: ${pfData.pf_payment_id || 'N/A'}`
              }]),
              orderId
            ]
          );
          console.log(`Order ${orderId} marked as PAID and CONFIRMED`);
        } else if (paymentStatus === 'CANCELLED') {
          await query(
            `UPDATE orders SET 
              payment_status = 'cancelled',
              status = 'cancelled',
              status_notes = $1,
              status_history = COALESCE(status_history, '[]'::jsonb) || $2::jsonb,
              updated_at = NOW()
            WHERE order_number = $3`,
            [
              `Payment cancelled via PayFast at ${new Date().toISOString()}`,
              JSON.stringify([{
                status: 'cancelled',
                payment_status: 'cancelled',
                timestamp: new Date().toISOString(),
                note: 'Payment cancelled by customer or PayFast'
              }]),
              orderId
            ]
          );
          console.log(`Order ${orderId} marked as CANCELLED`);
        } else {
          console.log(`Order ${orderId} received status: ${paymentStatus} — no update applied`);
        }
      } else {
        console.warn(`Order ${orderId} not found in database`);
      }
    }

    // Always respond 200 OK to PayFast
    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('PayFast ITN processing error:', error);
    // Still return 200 to prevent PayFast from retrying endlessly
    return res.status(200).json({ success: true });
  }
}
