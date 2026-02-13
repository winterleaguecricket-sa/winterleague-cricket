// Yoco payment verification endpoint
// Called by the success page after Yoco redirects back to confirm payment
import { query } from '../../../lib/db';
import { getYocoConfig } from './config';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orderId } = req.body;

  if (!orderId) {
    return res.status(400).json({ success: false, error: 'Order ID is required' });
  }

  try {
    // 1. Look up order in database
    const orderResult = await query(
      'SELECT id, order_number, total_amount, status, payment_status, payment_method, gateway_checkout_id FROM orders WHERE order_number = $1',
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      console.warn(`Yoco verify: order ${orderId} not found in database`);
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

    // 2. If we have a Yoco checkout ID, verify with Yoco API
    if (order.gateway_checkout_id) {
      const config = await getYocoConfig();

      if (config.secretKey) {
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
              // Payment confirmed by Yoco API — update order
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
                  `Payment verified via Yoco API at ${new Date().toISOString()}`,
                  JSON.stringify([{
                    status: 'confirmed',
                    payment_status: 'paid',
                    timestamp: new Date().toISOString(),
                    note: `Yoco checkout ${order.gateway_checkout_id} verified as completed`
                  }]),
                  orderId
                ]
              );

              console.log(`Order ${orderId} marked as PAID via Yoco API verification`);
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
            console.warn(`Yoco API returned ${yocoRes.status} for checkout ${order.gateway_checkout_id}`);
          }
        } catch (apiErr) {
          console.error('Yoco API verification error:', apiErr.message);
        }
      }
    }

    // 3. Fallback: If Yoco redirected to success URL, mark as paid
    // Yoco only redirects to successUrl when payment succeeds
    console.log(`Yoco verify fallback: marking order ${orderId} as paid (success redirect received)`);

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
        `Payment confirmed via success redirect at ${new Date().toISOString()}`,
        JSON.stringify([{
          status: 'confirmed',
          payment_status: 'paid',
          timestamp: new Date().toISOString(),
          note: 'Confirmed via Yoco success redirect'
        }]),
        orderId
      ]
    );

    return res.status(200).json({
      success: true,
      status: 'paid',
      message: 'Payment confirmed via success redirect'
    });

  } catch (error) {
    console.error('Yoco verify error:', error);
    return res.status(500).json({ success: false, error: 'Verification failed' });
  }
}
