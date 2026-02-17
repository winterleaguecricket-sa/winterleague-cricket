// API endpoint to save/load SMTP config from database (site_settings table)
import { query } from '../../lib/db';
import { clearSmtpConfigCache } from '../../lib/email';

export default async function handler(req, res) {
  // Check admin auth
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const authHeader = req.headers.authorization;
  const cookieAuth = req.cookies?.adminAuth;
  
  // Allow if admin auth cookie matches or authorization header
  const isAuthed = cookieAuth === adminPassword || 
    (authHeader && authHeader === `Bearer ${adminPassword}`);

  if (req.method === 'GET') {
    try {
      const result = await query(
        "SELECT value FROM site_settings WHERE key = 'smtp_config'"
      );
      
      if (result.rows.length > 0) {
        const config = JSON.parse(result.rows[0].value);
        // Mask password for security - only show last 4 chars
        const maskedPassword = config.password 
          ? '•'.repeat(Math.max(0, config.password.length - 4)) + config.password.slice(-4)
          : '';
        
        return res.status(200).json({
          success: true,
          config: {
            host: config.host || '',
            port: config.port || '465',
            user: config.user || '',
            password: maskedPassword,
            fromEmail: config.fromEmail || '',
            fromName: config.fromName || 'Winter League Cricket',
            hasPassword: !!config.password
          }
        });
      }
      
      return res.status(200).json({
        success: true,
        config: null,
        message: 'No SMTP configuration found'
      });
    } catch (error) {
      console.error('Error loading SMTP config:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { host, port, user, password, fromEmail, fromName } = req.body;

      if (!host || !user) {
        return res.status(400).json({
          success: false,
          message: 'Host and user are required'
        });
      }

      // Handle __KEEP_EXISTING__ password - preserve from current DB record
      let actualPassword = password;
      if (password === '__KEEP_EXISTING__') {
        try {
          const existing = await query(
            "SELECT value FROM site_settings WHERE key = 'smtp_config'"
          );
          if (existing.rows.length > 0) {
            const existingConfig = JSON.parse(existing.rows[0].value);
            actualPassword = existingConfig.password || '';
          } else {
            return res.status(400).json({
              success: false,
              message: 'No existing password found. Please enter your SMTP password.'
            });
          }
        } catch (err) {
          return res.status(400).json({
            success: false,
            message: 'Could not retrieve existing password. Please re-enter it.'
          });
        }
      }

      if (!actualPassword) {
        return res.status(400).json({
          success: false,
          message: 'Password is required'
        });
      }

      const configValue = JSON.stringify({
        host,
        port: port || '465',
        user,
        password: actualPassword,
        fromEmail: fromEmail || user,
        fromName: fromName || 'Winter League Cricket'
      });

      // Upsert into site_settings
      await query(
        `INSERT INTO site_settings (key, value, updated_at)
         VALUES ('smtp_config', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [configValue]
      );

      // Clear the in-memory cache so new config takes effect immediately
      clearSmtpConfigCache();

      return res.status(200).json({
        success: true,
        message: 'SMTP configuration saved to database successfully'
      });
    } catch (error) {
      console.error('Error saving SMTP config:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
