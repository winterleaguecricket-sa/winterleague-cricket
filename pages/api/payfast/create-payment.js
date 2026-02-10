// API endpoint to create a PayFast payment — generates signature server-side
import crypto from 'crypto';
import { getPayfastConfig } from './config';

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
      firstName, lastName, email, phone, customerId
    } = req.body;

    if (!orderId || !amount || !firstName || !email) {
      return res.status(400).json({
        success: false,
        error: 'Missing required payment fields'
      });
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

    // Determine PayFast URL
    const payfastUrl = config.testMode
      ? 'https://sandbox.payfast.co.za/eng/process'
      : 'https://www.payfast.co.za/eng/process';

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
