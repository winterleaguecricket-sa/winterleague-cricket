// API endpoint to create a Yoco checkout session
// Uses Yoco Online Payments API: https://developer.yoco.com/online/checkout
// SECURITY: Amount is read from DB order, not trusted from client
import { getYocoConfig } from './config';
import { query } from '../../../lib/db';
import { logPaymentEvent, logApiError } from '../../../lib/logger';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const config = await getYocoConfig();

    if (!config.secretKey) {
      logPaymentEvent({ orderId: orderId || 'unknown', email: req.body?.email, amount: null, gateway: 'yoco', status: 'config_error', details: 'Yoco secret key not configured' });
      return res.status(400).json({
        success: false,
        error: 'Yoco payment gateway not configured. Please contact administrator.'
      });
    }

    const {
      orderId, itemName, itemDescription,
      firstName, lastName, email, phone, customerId
    } = req.body;

    if (!orderId || !email) {
      return res.status(400).json({
        success: false,
        error: 'Missing required payment fields'
      });
    }

    // SECURITY: Read the order amount from the database — never trust client-sent amount
    const orderResult = await query(
      'SELECT total_amount, payment_status FROM orders WHERE order_number = $1',
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Order not found. Please try again.'
      });
    }

    const dbOrder = orderResult.rows[0];

    // Don't allow checkout for already-paid orders
    if (dbOrder.payment_status === 'paid') {
      return res.status(400).json({
        success: false,
        error: 'This order has already been paid.'
      });
    }

    const serverAmount = parseFloat(dbOrder.total_amount);
    if (isNaN(serverAmount) || serverAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order amount'
      });
    }

    // Determine the base URL from request headers
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const origin = `${protocol}://${host}`;

    // Yoco amounts are in cents (ZAR)
    const amountInCents = Math.round(serverAmount * 100);

    // Build Yoco checkout payload
    // Docs: https://developer.yoco.com/online/checkout/api
    const checkoutPayload = {
      amount: amountInCents,
      currency: 'ZAR',
      successUrl: `${origin}/checkout/success?order=${orderId}&gateway=yoco`,
      cancelUrl: `${origin}/checkout`,
      failureUrl: `${origin}/checkout?error=payment_failed`,
      metadata: {
        orderId: orderId,
        customerId: customerId || '',
        customerEmail: email,
        customerName: `${firstName || ''} ${lastName || ''}`.trim(),
        itemDescription: itemDescription || ''
      }
    };

    console.log('=== Yoco Checkout Debug ===');
    console.log('Amount (cents):', amountInCents);
    console.log('Order ID:', orderId);
    console.log('Success URL:', checkoutPayload.successUrl);
    console.log('Test Mode:', config.testMode);
    console.log('===========================');

    // Create checkout via Yoco API
    const yocoResponse = await fetch('https://payments.yoco.com/api/checkouts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.secretKey}`
      },
      body: JSON.stringify(checkoutPayload)
    });

    const yocoData = await yocoResponse.json();

    if (!yocoResponse.ok) {
      console.error('Yoco API error:', yocoData);
      logPaymentEvent({ orderId, email, amount: serverAmount, gateway: 'yoco', status: 'checkout_api_error', details: `Yoco API ${yocoResponse.status}: ${yocoData.message || yocoData.error || 'Unknown'}` });
      logApiError({ method: 'POST', url: '/api/yoco/create-checkout', statusCode: 400, error: `Yoco API error: ${JSON.stringify(yocoData)}`, body: { orderId, email } });
      return res.status(400).json({
        success: false,
        error: yocoData.message || yocoData.error || 'Failed to create Yoco checkout'
      });
    }

    console.log('Yoco checkout created:', yocoData.id);
    console.log('Redirect URL:', yocoData.redirectUrl);

    logPaymentEvent({ orderId, email, amount: serverAmount, gateway: 'yoco', status: 'checkout_created', details: `Checkout ID: ${yocoData.id}, Amount: R${serverAmount}` });

    // Store the Yoco checkout ID in the order record for later verification
    try {
      await query(
        `UPDATE orders SET gateway_checkout_id = $1, updated_at = NOW() WHERE order_number = $2`,
        [yocoData.id, orderId]
      );
      console.log(`Stored Yoco checkoutId ${yocoData.id} for order ${orderId}`);
    } catch (dbErr) {
      console.error('Failed to store Yoco checkoutId in DB:', dbErr.message);
      // Don't fail the checkout — payment can still proceed
    }

    return res.status(200).json({
      success: true,
      checkoutId: yocoData.id,
      redirectUrl: yocoData.redirectUrl,
      status: yocoData.status
    });

  } catch (error) {
    console.error('Yoco create-checkout error:', error);
    logApiError({ method: 'POST', url: '/api/yoco/create-checkout', statusCode: 500, error, body: req.body });
    logPaymentEvent({ orderId: req.body?.orderId || 'unknown', email: req.body?.email, amount: null, gateway: 'yoco', status: 'checkout_exception', details: error.message });
    return res.status(500).json({
      success: false,
      error: 'Failed to create payment session'
    });
  }
}
