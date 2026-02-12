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
    const jsonValue = JSON.stringify(config);
    console.log(`Saving PayFast config to DB (key: ${SETTINGS_KEY}, testMode: ${config.testMode}, merchantId length: ${config.merchantId?.length || 0})`);
    
    await query(
      `INSERT INTO site_settings (key, value, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2::jsonb, updated_at = NOW()`,
      [SETTINGS_KEY, jsonValue]
    );
    
    // Verify it was saved by reading it back
    const verify = await query(
      'SELECT value FROM site_settings WHERE key = $1',
      [SETTINGS_KEY]
    );
    if (verify.rows.length > 0 && verify.rows[0].value?.merchantId) {
      console.log(`PayFast config verified in DB — merchantId present`);
      return true;
    } else {
      console.error('PayFast config save appeared to succeed but verification read returned empty');
      return false;
    }
  } catch (error) {
    console.error('Error saving PayFast config to DB:', error.message, error.stack);
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const config = await getPayfastConfig();
    // Check if admin wants full credentials (for form pre-population)
    const showFull = req.query.admin === 'true';

    if (showFull) {
      // Return full credentials for the admin settings form
      return res.status(200).json({
        success: true,
        config: {
          merchantId: config.merchantId || '',
          merchantKey: config.merchantKey || '',
          passphrase: config.passphrase || '',
          testMode: config.testMode !== undefined ? config.testMode : true,
          isConfigured: !!(config.merchantId && config.merchantKey)
        }
      });
    }

    // Public GET — return masked data only
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
