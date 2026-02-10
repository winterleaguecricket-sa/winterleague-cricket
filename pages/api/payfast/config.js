// API endpoint for PayFast configuration - stored in site_settings DB table
import { query } from '../../../lib/db';

const SETTINGS_KEY = 'payfast_config';

async function getPayfastConfig() {
  try {
    const result = await query(
      'SELECT value FROM site_settings WHERE key = $1',
      [SETTINGS_KEY]
    );
    if (result.rows.length > 0) {
      return result.rows[0].value;
    }
  } catch (error) {
    console.error('Error reading PayFast config from DB:', error);
  }
  return { merchantId: '', merchantKey: '', passphrase: '', testMode: true };
}

async function savePayfastConfig(config) {
  try {
    await query(
      `INSERT INTO site_settings (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      [SETTINGS_KEY, JSON.stringify(config)]
    );
    return true;
  } catch (error) {
    console.error('Error saving PayFast config to DB:', error);
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const config = await getPayfastConfig();
    // Never expose full credentials to client — only return what's needed
    return res.status(200).json({
      success: true,
      config: {
        merchantId: config.merchantId ? `***${config.merchantId.slice(-4)}` : '',
        testMode: config.testMode,
        hasPassphrase: !!config.passphrase,
        isConfigured: !!(config.merchantId && config.merchantKey)
      }
    });
  }

  if (req.method === 'PUT') {
    const { merchantId, merchantKey, passphrase, testMode } = req.body;

    if (!merchantId || !merchantKey) {
      return res.status(400).json({ success: false, error: 'Merchant ID and Key are required' });
    }

    const config = {
      merchantId: merchantId.trim(),
      merchantKey: merchantKey.trim(),
      passphrase: passphrase ? passphrase.trim() : '',
      testMode: !!testMode
    };

    const saved = await savePayfastConfig(config);
    if (!saved) {
      return res.status(500).json({ success: false, error: 'Failed to save configuration' });
    }

    return res.status(200).json({ success: true });
  }

  // Internal method to get full config (used by other server-side APIs)
  return res.status(405).json({ error: 'Method not allowed' });
}

// Export for use by other server-side API routes (create-payment, notify)
export { getPayfastConfig };
