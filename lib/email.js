// Shared email utility functions
import nodemailer from 'nodemailer';
import { getEmailTemplate } from '../data/adminSettings';
import { query } from './db';

// Cached SMTP config to avoid DB query on every email
let _smtpConfigCache = null;
let _smtpConfigCacheTime = 0;
const SMTP_CACHE_TTL = 60000; // 1 minute cache

// Get SMTP configuration from database first, fallback to env vars
export async function getSmtpConfig() {
  // Return cache if fresh
  if (_smtpConfigCache && (Date.now() - _smtpConfigCacheTime) < SMTP_CACHE_TTL) {
    return _smtpConfigCache;
  }

  try {
    const result = await query(
      "SELECT value FROM site_settings WHERE key = 'smtp_config'"
    );
    if (result.rows.length > 0) {
      const raw = result.rows[0].value;
      const dbConfig = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (dbConfig.host && dbConfig.user && dbConfig.password) {
        _smtpConfigCache = {
          host: dbConfig.host,
          port: dbConfig.port || '465',
          user: dbConfig.user,
          password: dbConfig.password,
          fromEmail: dbConfig.fromEmail && dbConfig.fromEmail.includes('@') ? dbConfig.fromEmail : dbConfig.user,
          fromName: dbConfig.fromName || 'Winter League Cricket'
        };
        _smtpConfigCacheTime = Date.now();
        return _smtpConfigCache;
      }
    }
  } catch (err) {
    console.error('Error reading SMTP config from DB:', err.message);
  }

  // Fallback to environment variables
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;
  const rawFromEmail = process.env.SMTP_FROM_EMAIL;

  const config = {
    host: host || '',
    port: process.env.SMTP_PORT || '465',
    user: user || '',
    password: smtpPassword || '',
    fromEmail: rawFromEmail && rawFromEmail.includes('@') ? rawFromEmail : (user || ''),
    fromName: process.env.SMTP_FROM_NAME || 'Winter League Cricket'
  };

  if (config.host && config.user && config.password) {
    _smtpConfigCache = config;
    _smtpConfigCacheTime = Date.now();
  }

  return config;
}

// Clear the SMTP config cache (call after saving new config)
export function clearSmtpConfigCache() {
  _smtpConfigCache = null;
  _smtpConfigCacheTime = 0;
}

// Create a nodemailer transporter from SMTP config
export function createTransporter(smtpConfig) {
  return nodemailer.createTransport({
    host: smtpConfig.host,
    port: parseInt(smtpConfig.port) || 465,
    secure: parseInt(smtpConfig.port) === 465,
    auth: {
      user: smtpConfig.user,
      pass: smtpConfig.password
    }
  });
}

// Send registration confirmation email
export async function sendRegistrationEmail({ teamName, coachName, email, password, registrationId, loginUrl }) {
  try {
    // Validate required fields
    if (!email || !teamName) {
      console.log('Missing required email fields');
      return { success: false, message: 'Missing required fields' };
    }

    // Get SMTP configuration from database/env
    const smtp = await getSmtpConfig();
    const host = smtp.host;
    const port = smtp.port;
    const user = smtp.user;
    const smtpPassword = smtp.password;
    const fromEmail = smtp.fromEmail;
    const fromName = smtp.fromName;

    // Get the email template from settings
    const template = getEmailTemplate('pending');
    
    // Default template if none set
    let subject = template?.subject || 'Welcome to Winter League Cricket - Registration Confirmed!';
    let body = template?.body || `Dear {coachName},

Thank you for registering {teamName} with Winter League Cricket!

Your registration has been received and is being processed. Here are your Team Portal login details:

📧 Email: {email}
🔑 Password: {password}

🔗 Login at: {loginUrl}

Please keep these credentials safe. You can use them to:
- View and manage your team roster
- Register players for the league
- Track your team's status and upcoming matches
- Update team information

If you have any questions, please don't hesitate to contact us.

Best regards,
Winter League Cricket Team`;

    // Replace variables in template
    const shortRegistrationId = String(registrationId || '').slice(-4);
    const variables = {
      '{teamName}': teamName || '',
      '{coachName}': coachName || 'Team Manager',
      '{email}': email || '',
      '{password}': password || '',
      '{registrationId}': shortRegistrationId || '',
      '{loginUrl}': loginUrl || 'https://winterleaguecricket.co.za/team-portal'
    };

    Object.entries(variables).forEach(([key, value]) => {
      subject = subject.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
      body = body.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
    });

    // Check if email is configured
    if (!host || !user || !smtpPassword) {
      console.log('=== REGISTRATION EMAIL (Development Mode) ===');
      console.log('To:', email);
      console.log('Subject:', subject);
      console.log('==============================================');
      return { success: true, message: 'Email logged (dev mode)', devMode: true };
    }

    // Create transporter
    const transporter = createTransporter(smtp);

    // Send email
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: email,
      subject: subject,
      text: body,
      html: body.replace(/\n/g, '<br>')
    });

    console.log('Registration email sent:', info.messageId);
    return { success: true, message: 'Email sent successfully', messageId: info.messageId };

  } catch (error) {
    console.error('Error sending registration email:', error.message);
    return { success: false, message: error.message };
  }
}

// Send parent email (payment success or player approved)
export async function sendParentEmail({ templateKey, parentName, playerName, teamName, email, password, orderNumber, totalAmount, loginUrl }) {
  try {
    if (!email) {
      console.log('sendParentEmail: no email address provided');
      return { success: false, message: 'Missing email address' };
    }

    const template = getEmailTemplate(templateKey);
    if (!template || !template.subject || !template.body) {
      console.log(`sendParentEmail: template "${templateKey}" not found`);
      return { success: false, message: `Template "${templateKey}" not found` };
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://winterleaguecricket.co.za';

    const variables = {
      '{parentName}': parentName || 'Parent',
      '{playerName}': playerName || '',
      '{teamName}': teamName || '',
      '{email}': email || '',
      '{password}': password || '',
      '{orderNumber}': orderNumber || '',
      '{totalAmount}': totalAmount || '0.00',
      '{loginUrl}': loginUrl || `${baseUrl}/parent-portal`
    };

    let subject = template.subject;
    let body = template.body;
    Object.entries(variables).forEach(([key, value]) => {
      const escaped = key.replace(/[{}]/g, '\\$&');
      subject = subject.replace(new RegExp(escaped, 'g'), value);
      body = body.replace(new RegExp(escaped, 'g'), value);
    });

    const smtp = await getSmtpConfig();
    const host = smtp.host;
    const port = smtp.port;
    const user = smtp.user;
    const smtpPassword = smtp.password;
    const fromEmail = smtp.fromEmail;
    const fromName = smtp.fromName;

    if (!host || !user || !smtpPassword) {
      console.log(`=== PARENT EMAIL [${templateKey}] (Development Mode) ===`);
      console.log('To:', email);
      console.log('Subject:', subject);
      console.log('Body:', body.substring(0, 200) + '...');
      console.log('=============================================');
      return { success: true, message: 'Email logged (dev mode)', devMode: true };
    }

    const transporter = createTransporter(smtp);

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: email,
      subject: subject,
      text: body,
      html: body.replace(/\n/g, '<br>')
    });

    console.log(`Parent email [${templateKey}] sent to ${email}:`, info.messageId);
    return { success: true, message: 'Email sent successfully', messageId: info.messageId };

  } catch (error) {
    console.error(`Error sending parent email [${templateKey}]:`, error.message);
    return { success: false, message: error.message };
  }
}

export default { sendRegistrationEmail, sendParentEmail, getSmtpConfig, clearSmtpConfigCache, createTransporter };
