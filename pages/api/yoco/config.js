// API endpoint for Yoco configuration - stored in site_settings DB table
// SECURITY: Secret key is never returned in full via GET. PUT requires admin password.
import { query } from '../../../lib/db';
import fs from 'fs';
import path from 'path';

const SETTINGS_KEY = 'yoco_config';

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

async function getYocoConfig() {
  try {
    const result = await query(
      'SELECT value FROM site_settings WHERE key = $1',
      [SETTINGS_KEY]
    );
    if (result.rows.length > 0) {
      return result.rows[0].value;
    }
  } catch (error) {
    console.error('Error reading Yoco config from DB:', error);
  }
  return { secretKey: '', publicKey: '', testMode: true };
}

async function saveYocoConfig(config) {
  try {
    const jsonValue = JSON.stringify(config);
    console.log(`Saving Yoco config to DB (key: ${SETTINGS_KEY}, testMode: ${config.testMode})`);

    await query(
      `INSERT INTO site_settings (key, value, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2::jsonb, updated_at = NOW()`,
      [SETTINGS_KEY, jsonValue]
    );

    // Verify
    const verify = await query(
      'SELECT value FROM site_settings WHERE key = $1',
      [SETTINGS_KEY]
    );
    if (verify.rows.length > 0 && verify.rows[0].value?.secretKey) {
      console.log('Yoco config verified in DB');
      return true;
    } else {
      console.error('Yoco config save appeared to succeed but verification failed');
      return false;
    }
  } catch (error) {
    console.error('Error saving Yoco config to DB:', error.message);
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const config = await getYocoConfig();

    // SECURITY: Never return the full secret key via API
    // Only return masked version and configuration status
    const maskedSecret = config.secretKey
      ? `sk_...${config.secretKey.slice(-4)}`
      : '';

    return res.status(200).json({
      success: true,
      config: {
        secretKey: maskedSecret,
        publicKey: config.publicKey || '',
        testMode: config.testMode !== undefined ? config.testMode : true,
        isConfigured: !!(config.secretKey)
      }
    });
  }

  if (req.method === 'PUT') {
    const { secretKey, publicKey, testMode, adminPassword } = req.body;

    // SECURITY: Require admin password for config changes
    if (!verifyAdminPassword(adminPassword)) {
      return res.status(401).json({ success: false, error: 'Admin authentication required' });
    }

    if (!secretKey) {
      return res.status(400).json({ success: false, error: 'Secret Key is required' });
    }

    const config = {
      secretKey: secretKey.trim(),
      publicKey: publicKey ? publicKey.trim() : '',
      testMode: !!testMode
    };

    const saved = await saveYocoConfig(config);
    if (!saved) {
      return res.status(500).json({ success: false, error: 'Failed to save configuration' });
    }

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export { getYocoConfig };
