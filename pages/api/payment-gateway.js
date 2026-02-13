// API endpoint to get/set the active payment gateway
import { query } from '../../lib/db';

const SETTINGS_KEY = 'active_gateway';

export async function getActiveGateway() {
  try {
    const result = await query(
      'SELECT value FROM site_settings WHERE key = $1',
      [SETTINGS_KEY]
    );
    if (result.rows.length > 0) {
      return result.rows[0].value?.gateway || 'payfast';
    }
  } catch (error) {
    console.error('Error reading active gateway from DB:', error);
  }
  return 'payfast'; // Default to PayFast
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const gateway = await getActiveGateway();
    return res.status(200).json({ success: true, gateway });
  }

  if (req.method === 'PUT') {
    const { gateway } = req.body;

    if (!gateway || !['payfast', 'yoco'].includes(gateway)) {
      return res.status(400).json({ success: false, error: 'Invalid gateway. Must be "payfast" or "yoco".' });
    }

    try {
      const jsonValue = JSON.stringify({ gateway });
      await query(
        `INSERT INTO site_settings (key, value, updated_at)
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $2::jsonb, updated_at = NOW()`,
        [SETTINGS_KEY, jsonValue]
      );

      console.log(`Active payment gateway set to: ${gateway}`);
      return res.status(200).json({ success: true, gateway });
    } catch (error) {
      console.error('Error saving active gateway:', error);
      return res.status(500).json({ success: false, error: 'Failed to save gateway selection' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
