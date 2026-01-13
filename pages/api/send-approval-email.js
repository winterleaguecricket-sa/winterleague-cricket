export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, subject, body } = req.body;

    if (!to || !subject || !body) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // In a production environment, you would use a service like:
    // - SendGrid
    // - AWS SES
    // - Mailgun
    // - Nodemailer with SMTP
    
    // For development/demo purposes, we'll just log the email
    console.log('=== EMAIL SENT ===');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Body:', body);
    console.log('==================');

    // Simulate sending email
    // In production, replace this with actual email service:
    /*
    const nodemailer = require('nodemailer');
    
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.ADMIN_EMAIL,
      to: to,
      subject: subject,
      text: body,
    });
    */

    return res.status(200).json({ 
      success: true, 
      message: 'Email sent successfully',
      // For demo purposes, return the email content
      emailSent: { to, subject, body }
    });

  } catch (error) {
    console.error('Email sending error:', error);
    return res.status(500).json({ 
      error: 'Failed to send email',
      details: error.message 
    });
  }
}
