// API endpoint to send product order emails
// This endpoint sends confirmation emails to customers and forwards order details to suppliers
import nodemailer from 'nodemailer';
import { getSmtpConfig, createTransporter } from '../../lib/email';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { customerEmail, supplierEmail, customerEmailData, supplierEmailData, testMode, smtpConfig } = req.body;

    // Validate required fields
    if (!customerEmail || !supplierEmail || !customerEmailData || !supplierEmailData) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        success: false 
      });
    }

    // Determine SMTP configuration source
    let host, port, user, password, fromEmail, fromName;
    
    if (testMode && smtpConfig) {
      // Use provided config for testing
      host = smtpConfig.host;
      port = smtpConfig.port;
      user = smtpConfig.user;
      password = smtpConfig.password;
      fromEmail = smtpConfig.fromEmail;
      fromName = smtpConfig.fromName;
    } else {
      // Use database/env config for production
      const smtp = await getSmtpConfig();
      host = smtp.host;
      port = smtp.port;
      user = smtp.user;
      password = smtp.password;
      fromEmail = smtp.fromEmail;
      fromName = smtp.fromName;
    }

    // Check if email is configured
    if (!host || !user || !password) {
      console.log('=== EMAIL NOT CONFIGURED (Development Mode) ===');
      console.log('\n--- Customer Confirmation Email ---');
      console.log('To:', customerEmail);
      console.log('Subject:', customerEmailData.subject);
      console.log('Body:', customerEmailData.body);
      
      console.log('\n--- Supplier Forward Email ---');
      console.log('To:', supplierEmail);
      console.log('Subject:', supplierEmailData.subject);
      console.log('Body:', supplierEmailData.body);
      console.log('\n=================================\n');

      return res.status(200).json({ 
        success: true,
        message: 'Order emails logged (development mode - configure SMTP to send real emails)',
        customerEmail,
        supplierEmail
      });
    }

    // Create Nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: host,
      port: parseInt(port || '465'),
      secure: parseInt(port || '465') === 465, // true for 465, false for other ports
      auth: {
        user: user,
        pass: password
      }
    });

    // Verify transporter connection
    await transporter.verify();
    console.log('Email server connection verified');

    // Send customer confirmation email
    const customerInfo = await transporter.sendMail({
      from: `"${fromName || 'Cricket League'}" <${fromEmail || user}>`,
      to: customerEmail,
      subject: customerEmailData.subject,
      text: customerEmailData.body,
      html: customerEmailData.body.replace(/\n/g, '<br>')
    });
    console.log('Customer email sent:', customerInfo.messageId);

    // Send supplier forward email
    const supplierInfo = await transporter.sendMail({
      from: `"${fromName || 'Cricket League'}" <${fromEmail || user}>`,
      to: supplierEmail,
      subject: supplierEmailData.subject,
      text: supplierEmailData.body,
      html: supplierEmailData.body.replace(/\n/g, '<br>')
    });
    console.log('Supplier email sent:', supplierInfo.messageId);

    return res.status(200).json({ 
      success: true,
      message: testMode ? 'Test emails sent successfully! Check your inbox.' : 'Order emails sent successfully',
      customerEmail,
      supplierEmail,
      customerMessageId: customerInfo.messageId,
      supplierMessageId: supplierInfo.messageId
    });

  } catch (error) {
    console.error('Error sending order emails:', error);
    
    let errorMessage = 'Failed to send order emails. ';
    
    if (error.code === 'EAUTH') {
      errorMessage += 'Authentication failed. Check your SMTP credentials.';
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNECTION') {
      errorMessage += 'Connection timeout. Check your SMTP settings.';
    } else {
      errorMessage += error.message;
    }
    
    return res.status(500).json({ 
      success: false,
      message: errorMessage,
      error: error.message 
    });
  }
}
