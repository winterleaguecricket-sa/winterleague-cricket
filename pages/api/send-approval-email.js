// API endpoint to send approval status notification emails
import nodemailer from 'nodemailer';
import { getSmtpConfig, createTransporter } from '../../lib/email';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, subject, body } = req.body;

    if (!to || !subject || !body) {
      return res.status(400).json({ error: 'Missing required fields (to, subject, body)' });
    }

    // Get SMTP configuration from database/env
    const smtp = await getSmtpConfig();
    const host = smtp.host;
    const user = smtp.user;
    const password = smtp.password;
    const fromEmail = smtp.fromEmail;
    const fromName = smtp.fromName;

    // Check if email is configured
    if (!host || !user || !password) {
      console.log('=== APPROVAL EMAIL (Development Mode) ===');
      console.log('To:', to);
      console.log('Subject:', subject);
      console.log('Body:', body);
      console.log('==========================================');

      return res.status(200).json({ 
        success: true,
        message: 'Email logged (development mode - configure SMTP to send real emails)',
        emailSent: { to, subject, body }
      });
    }

    // Create Nodemailer transporter
    const transporter = createTransporter(smtp);

    // Verify transporter connection
    await transporter.verify();
    console.log('Email server connection verified for approval email');

    // Send the approval status email
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail || user}>`,
      to: to,
      subject: subject,
      text: body,
      html: body.replace(/\n/g, '<br>')
    });
    console.log('Approval email sent:', info.messageId);

    return res.status(200).json({ 
      success: true, 
      message: 'Email sent successfully',
      messageId: info.messageId
    });

  } catch (error) {
    console.error('Approval email sending error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to send email',
      details: error.message 
    });
  }
}
