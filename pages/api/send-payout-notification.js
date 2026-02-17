import nodemailer from 'nodemailer';
import { getAdminSettings, getEmailTemplate } from '../../data/adminSettings';
import { getSmtpConfig, createTransporter } from '../../lib/email';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { requestId, teamName, coachName, email, phone, amount, breakdown, requestDate } = req.body;

    if (!requestId || !teamName || !coachName || !email || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const settings = getAdminSettings();
    const template = getEmailTemplate('payoutRequest');

    if (!template) {
      console.error('Payout request email template not found');
      return res.status(500).json({ error: 'Email template not configured' });
    }

    // Get SMTP configuration from database/env
    const smtp = await getSmtpConfig();
    const smtpFromEmail = smtp.fromEmail || settings.email;
    const smtpFromName = smtp.fromName || 'Cricket League';

    if (!smtp.host || !smtp.user || !smtp.password) {
      console.log('SMTP not configured - payout notification email not sent');
      return res.status(200).json({ 
        success: true, 
        message: 'Payout request created (email not sent - SMTP not configured)' 
      });
    }

    // Create transporter
    const transporter = createTransporter(smtp);

    // Get admin link (use request headers to construct URL)
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers['host'];
    const adminLink = `${protocol}://${host}`;

    // Prepare email data
    const subject = template.subject
      .replace('{teamName}', teamName)
      .replace('#{requestId}', requestId);

    const body = template.body
      .replace('{teamName}', teamName)
      .replace('{coachName}', coachName)
      .replace('{email}', email)
      .replace('{phone}', phone)
      .replace('#{requestId}', requestId)
      .replace('{amount}', amount.toFixed(2))
      .replace('{markup}', breakdown.markup.toFixed(2))
      .replace('{commission}', breakdown.commission.toFixed(2))
      .replace('{requestDate}', new Date(requestDate).toLocaleString())
      .replace('{adminLink}', adminLink);

    // Send email to admin
    await transporter.sendMail({
      from: `"${smtpFromName}" <${smtpFromEmail}>`,
      to: settings.email,
      subject: subject,
      text: body,
    });

    console.log(`Payout request notification sent to admin: ${settings.email}`);

    return res.status(200).json({ 
      success: true, 
      message: 'Payout request created and notification sent to admin' 
    });

  } catch (error) {
    console.error('Error sending payout notification:', error);
    return res.status(500).json({ 
      error: 'Failed to send notification', 
      details: error.message 
    });
  }
}
