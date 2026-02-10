// API endpoint to send team registration confirmation emails
import nodemailer from 'nodemailer';
import { getEmailTemplate } from '../../data/adminSettings';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { teamName, coachName, email, password, registrationId, loginUrl } = req.body;

    // Validate required fields
    if (!email || !teamName) {
      return res.status(400).json({ 
        message: 'Missing required fields (email, teamName)',
        success: false 
      });
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
    const template = getEmailTemplate('pending'); // Using 'pending' template for new registrations
    
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
      console.log('Body:', body);
      console.log('==============================================');

      return res.status(200).json({ 
        success: true,
        message: 'Registration email logged (development mode - configure SMTP to send real emails)',
        emailSent: { to: email, subject, body }
      });
    }

    // Create Nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: host,
      port: parseInt(port || '465'),
      secure: parseInt(port || '465') === 465,
      auth: {
        user: user,
        pass: smtpPassword
      }
    });

    // Verify transporter connection
    await transporter.verify();
    console.log('Email server connection verified for registration email');

    // Send registration confirmation email
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail || user}>`,
      to: email,
      subject: subject,
      text: body,
      html: body.replace(/\n/g, '<br>')
    });
    console.log('Registration email sent:', info.messageId);

    return res.status(200).json({ 
      success: true,
      message: 'Registration confirmation email sent successfully',
      messageId: info.messageId
    });

  } catch (error) {
    console.error('Registration email error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Failed to send registration email',
      error: error.message 
    });
  }
}
