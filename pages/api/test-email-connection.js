// API endpoint to test email connection
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { host, port, user, password } = req.body;

    // Validate required fields
    if (!host || !port || !user || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Missing required fields: host, port, user, or password'
      });
    }

    // Create transporter with provided config
    const transporter = nodemailer.createTransport({
      host: host,
      port: parseInt(port),
      secure: parseInt(port) === 465, // true for 465, false for other ports
      auth: {
        user: user,
        pass: password
      }
    });

    // Verify connection
    await transporter.verify();

    return res.status(200).json({ 
      success: true,
      message: `Successfully connected to ${host}:${port}! Your email configuration is working.`
    });

  } catch (error) {
    console.error('Email connection test failed:', error);
    
    let errorMessage = 'Connection test failed. ';
    
    if (error.code === 'EAUTH') {
      errorMessage += 'Authentication failed. Check your username and password. For Gmail, use an App Password.';
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNECTION') {
      errorMessage += 'Connection timeout. Check your host, port, and internet connection.';
    } else if (error.code === 'ENOTFOUND') {
      errorMessage += 'SMTP host not found. Check your SMTP_HOST setting.';
    } else {
      errorMessage += error.message;
    }
    
    return res.status(500).json({ 
      success: false,
      message: errorMessage,
      error: error.message,
      code: error.code
    });
  }
}
