// API endpoint for PayFast configuration - stored in site_settings DB table
// SECURITY: Credentials are never returned in full via GET. PUT requires admin password.
import { query } from '../../../lib/db';
import fs from 'fs';
import path from 'path';

const SETTINGS_KEY = 'payfast_config';

// Simple admin password check — reuses the same admin auth logic
function verifyAdminPassword(password) {
  if (!password) return false;
  try {
    const settingsFile = path.join(process.cwd(), 'data', 'adminSettings.json');
    let storedPassword = '';
    if (fs.existsSync(settingsFile)) {
      const data = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
      storedPassword = data.password || '';
    }
    const envPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
    const validPassword = storedPassword || envPassword || 'admin123';
    return password === validPassword;
  } catch {
    return false;
  }
}

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

    // SECURITY: Never return full credentials via API — always mask sensitive fields
    return res.status(200).json({
      success: true,
      config: {
        merchantId: config.merchantId ? `***${config.merchantId.slice(-4)}` : '',
        merchantKey: config.merchantKey ? `***${config.merchantKey.slice(-4)}` : '',
        passphrase: config.passphrase ? '••••••••' : '',
        testMode: config.testMode !== undefined ? config.testMode : true,
        isConfigured: !!(config.merchantId && config.merchantKey)
      }
    });
  }

  if (req.method === 'PUT') {
    const { merchantId, merchantKey, passphrase, testMode, adminPassword } = req.body;

    // SECURITY: Require admin password for config changes
    if (!verifyAdminPassword(adminPassword)) {
      return res.status(401).json({ success: false, error: 'Admin authentication required' });
    }

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
