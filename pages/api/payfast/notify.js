import crypto from 'crypto';
import { getAllProfiles, getProfileOrders } from '../../../data/customers';
import { siteConfig } from '../../../data/products';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const pfData = req.body;

    // Validate PayFast signature
    const pfParamString = Object.keys(pfData)
      .filter(key => key !== 'signature')
      .sort()
      .map(key => `${key}=${encodeURIComponent(pfData[key].toString().trim()).replace(/%20/g, '+')}`)
      .join('&');

    let tempParamString = pfParamString;
    if (siteConfig.paymentConfig.payfast.passphrase) {
      tempParamString += `&passphrase=${encodeURIComponent(siteConfig.paymentConfig.payfast.passphrase.trim()).replace(/%20/g, '+')}`;
    }

    const signature = crypto.createHash('md5').update(tempParamString).digest('hex');

    if (signature !== pfData.signature) {
      console.error('PayFast signature validation failed');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Verify payment status
    const paymentStatus = pfData.payment_status;
    const orderId = pfData.m_payment_id;
    const customerId = pfData.custom_str1;

    console.log(`PayFast ITN received - Order: ${orderId}, Status: ${paymentStatus}`);

    // Update order status based on payment status
    if (paymentStatus === 'COMPLETE') {
      // Payment successful - update order in customer profile
      // Note: In a real application, you would update the order status in a database
      console.log(`Order ${orderId} payment completed successfully`);
      
      // Here you could add logic to:
      // - Send confirmation email
      // - Update inventory
      // - Trigger fulfillment process
    } else {
      console.log(`Order ${orderId} payment status: ${paymentStatus}`);
    }

    // Always respond with 200 OK to PayFast
    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('PayFast ITN processing error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
