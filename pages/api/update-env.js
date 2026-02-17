// DEPRECATED: This endpoint previously overwrote .env.local destroying all env vars.
// Now redirects to database-backed /api/smtp-config instead.
// Kept for backward compatibility with any existing admin pages that call it.

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

    // Forward to the safe database-backed endpoint
    const { query } = await import('../../lib/db');
    const { clearSmtpConfigCache } = await import('../../lib/email');

    const configValue = JSON.stringify({
      host,
      port: port || '465',
      user,
      password,
      fromEmail: fromEmail || user,
      fromName: fromName || 'Winter League Cricket'
    });

    await query(
      `INSERT INTO site_settings (key, value, updated_at)
       VALUES ('smtp_config', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
      [configValue]
    );

    clearSmtpConfigCache();

    return res.status(200).json({ 
      success: true,
      message: 'SMTP configuration saved to database successfully! Changes take effect immediately.'
    });

  } catch (error) {
    console.error('Error saving SMTP config:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Failed to save SMTP configuration: ' + error.message
    });
  }
}
