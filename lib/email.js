// Shared email utility functions
import nodemailer from 'nodemailer';
import { getEmailTemplate } from '../data/adminSettings';

// Send registration confirmation email
export async function sendRegistrationEmail({ teamName, coachName, email, password, registrationId, loginUrl }) {
  try {
    // Validate required fields
    if (!email || !teamName) {
      console.log('Missing required email fields');
      return { success: false, message: 'Missing required fields' };
    }

    // Get SMTP configuration from environment
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const rawFromEmail = process.env.SMTP_FROM_EMAIL;
    const fromEmail = rawFromEmail && rawFromEmail.includes('@') ? rawFromEmail : user;
    const fromName = process.env.SMTP_FROM_NAME || 'Winter League Cricket';

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
    const transporter = nodemailer.createTransport({
      host: host,
      port: parseInt(port) || 465,
      secure: parseInt(port) === 465,
      auth: {
        user: user,
        pass: smtpPassword
      }
    });

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

    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const rawFromEmail = process.env.SMTP_FROM_EMAIL;
    const fromEmail = rawFromEmail && rawFromEmail.includes('@') ? rawFromEmail : user;
    const fromName = process.env.SMTP_FROM_NAME || 'Winter League Cricket';

    if (!host || !user || !smtpPassword) {
      console.log(`=== PARENT EMAIL [${templateKey}] (Development Mode) ===`);
      console.log('To:', email);
      console.log('Subject:', subject);
      console.log('Body:', body.substring(0, 200) + '...');
      console.log('=============================================');
      return { success: true, message: 'Email logged (dev mode)', devMode: true };
    }

    const transporter = nodemailer.createTransport({
      host: host,
      port: parseInt(port) || 465,
      secure: parseInt(port) === 465,
      auth: {
        user: user,
        pass: smtpPassword
      }
    });

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

export default { sendRegistrationEmail, sendParentEmail };
