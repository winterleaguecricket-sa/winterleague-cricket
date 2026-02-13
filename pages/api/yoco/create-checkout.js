// API endpoint to create a Yoco checkout session
// Uses Yoco Online Payments API: https://developer.yoco.com/online/checkout
import { getYocoConfig } from './config';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const config = await getYocoConfig();

    if (!config.secretKey) {
      return res.status(400).json({
        success: false,
        error: 'Yoco payment gateway not configured. Please contact administrator.'
      });
    }

    const {
      orderId, amount, itemName, itemDescription,
      firstName, lastName, email, phone, customerId
    } = req.body;

    if (!orderId || !amount || !email) {
      return res.status(400).json({
        success: false,
        error: 'Missing required payment fields'
      });
    }

    // Determine the base URL from request headers
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const origin = `${protocol}://${host}`;

    // Yoco amounts are in cents (ZAR)
    const amountInCents = Math.round(parseFloat(amount) * 100);

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
      return res.status(400).json({
        success: false,
        error: yocoData.message || yocoData.error || 'Failed to create Yoco checkout'
      });
    }

    console.log('Yoco checkout created:', yocoData.id);
    console.log('Redirect URL:', yocoData.redirectUrl);

    // Store the Yoco checkout ID in the order record for later verification
    try {
      const { query: dbQuery } = await import('../../../lib/db');
      await dbQuery(
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
    return res.status(500).json({
      success: false,
      error: 'Failed to create payment session'
    });
  }
}
