// API endpoint to create a PayFast payment — generates signature server-side
// ATOMIC: Creates order + PayFast payment in one call — no order without payment session
import crypto from 'crypto';
import { getPayfastConfig } from './config';
import { query } from '../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const config = await getPayfastConfig();

    if (!config.merchantId || !config.merchantKey) {
      return res.status(400).json({
        success: false,
        error: 'Payment gateway not configured. Please contact administrator.'
      });
    }

    const {
      orderId, amount, itemName, itemDescription,
      firstName, lastName, email, phone, customerId,
      orderData
    } = req.body;

    if (!orderId || !amount || !firstName || !email) {
      return res.status(400).json({
        success: false,
        error: 'Missing required payment fields'
      });
    }

    // ===== CREATE ORDER IN DB (atomic with payment) =====
    if (orderData) {
      const total = parseFloat(orderData.total);
      if (isNaN(total) || total <= 0) {
        return res.status(400).json({ success: false, error: 'Invalid order amount' });
      }

      // Check if order already exists (idempotency)
      const existingOrder = await query(
        'SELECT id FROM orders WHERE order_number = $1', [orderId]
      );

      if (existingOrder.rows.length === 0) {
        try {
          await query(
            `INSERT INTO orders (order_number, customer_email, customer_name, customer_phone, items, total_amount, status, payment_method, payment_status, order_type, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, 'pending', $8, NOW(), NOW())`,
            [
              orderData.orderNumber,
              orderData.customerEmail,
              orderData.customerName,
              orderData.customerPhone || '',
              JSON.stringify(orderData.items || []),
              total,
              orderData.paymentMethod || 'payfast',
              orderData.orderType || 'registration'
            ]
          );
          console.log(`Order ${orderId} created in DB (atomic with PayFast payment)`);
        } catch (dbErr) {
          console.error('Failed to create order in DB:', dbErr.message);
          return res.status(500).json({ success: false, error: 'Failed to create order. Please try again.' });
        }
      }
    }

    // Determine the base URL from the request headers
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const origin = `${protocol}://${host}`;

    // Build payment data in the exact order PayFast expects
    const paymentData = {
      merchant_id: config.merchantId,
      merchant_key: config.merchantKey,
      return_url: `${origin}/checkout/success?order=${orderId}`,
      cancel_url: `${origin}/checkout`,
      notify_url: `${origin}/api/payfast/notify`,
      name_first: firstName,
      name_last: lastName || '',
      email_address: email,
      cell_number: phone || '',
      m_payment_id: orderId,
      amount: parseFloat(amount).toFixed(2),
      item_name: itemName || `Order #${orderId}`,
      item_description: itemDescription || '',
      custom_str1: customerId || ''
    };

    // Generate signature — must preserve insertion order, NOT sort
    let pfOutput = '';
    for (const key in paymentData) {
      if (paymentData.hasOwnProperty(key) && paymentData[key] !== '') {
        pfOutput += `${key}=${encodeURIComponent(paymentData[key].toString().trim()).replace(/%20/g, '+')}&`;
      }
    }
    let signatureString = pfOutput.slice(0, -1); // Remove trailing &

    if (config.passphrase) {
      signatureString += `&passphrase=${encodeURIComponent(config.passphrase.trim()).replace(/%20/g, '+')}`;
    }

    const signature = crypto.createHash('md5').update(signatureString).digest('hex');
    paymentData.signature = signature;

    // Remove empty fields so only signed fields are submitted to PayFast
    for (const key in paymentData) {
      if (paymentData.hasOwnProperty(key) && paymentData[key] === '') {
        delete paymentData[key];
      }
    }

    // Determine PayFast URL
    const payfastUrl = config.testMode
      ? 'https://sandbox.payfast.co.za/eng/process'
      : 'https://www.payfast.co.za/eng/process';

    // Debug logging for payment troubleshooting
    console.log('=== PayFast Payment Debug ===');
    console.log('PayFast URL:', payfastUrl);
    console.log('Merchant ID:', config.merchantId);
    console.log('Test Mode:', config.testMode);
    console.log('Origin:', origin);
    console.log('Amount:', paymentData.amount);
    console.log('Order ID:', paymentData.m_payment_id);
    console.log('Return URL:', paymentData.return_url);
    console.log('Notify URL:', paymentData.notify_url);
    console.log('Signature:', signature);
    console.log('=============================');

    return res.status(200).json({
      success: true,
      paymentData,
      payfastUrl
    });

  } catch (error) {
    console.error('Error creating PayFast payment:', error);
    return res.status(500).json({ success: false, error: 'Failed to create payment' });
  }
}
