// API endpoint to update .env.local file
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { host, port, user, password, fromEmail, fromName } = req.body;

    // Validate required fields
    if (!host || !port || !user || !password || !fromEmail || !fromName) {
      return res.status(400).json({ 
        success: false,
        message: 'Missing required fields'
      });
    }

    // Path to .env.local file
    const envPath = path.join(process.cwd(), '.env.local');

    // Create the environment variable content
    const envContent = `# Email Configuration (Nodemailer)
SMTP_HOST=${host}
SMTP_PORT=${port}
SMTP_USER=${user}
SMTP_PASSWORD=${password}
SMTP_FROM_EMAIL=${fromEmail}
SMTP_FROM_NAME=${fromName}
`;

    // Write to .env.local file
    fs.writeFileSync(envPath, envContent, 'utf8');

    return res.status(200).json({ 
      success: true,
      message: 'Environment file updated successfully! Please restart your development server for changes to take effect.'
    });

  } catch (error) {
    console.error('Error updating .env.local:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Failed to update environment file: ' + error.message
    });
  }
}
