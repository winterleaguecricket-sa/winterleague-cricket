import { query } from '../../lib/db';

const SETTINGS_KEY = 'entry_fee_settings';
const DEFAULT_SETTINGS = {
  baseFee: 500,
  includedItems: [
    'Full season league participation',
    'Official league jersey',
    'League insurance coverage',
    'Access to league facilities'
  ]
};

async function readSetting() {
  const res = await query('SELECT value FROM site_settings WHERE key = $1', [SETTINGS_KEY]);
  if (res.rows.length > 0) {
    const value = res.rows[0].value;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (error) {
        return value;
      }
    }
    return value;
  }
  return null;
}

async function writeSetting(value) {
  await query(
    `INSERT INTO site_settings (key, value)
     VALUES ($1, $2)
     ON CONFLICT (key)
     DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
    [SETTINGS_KEY, JSON.stringify(value)]
  );
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const existing = await readSetting();
      if (existing && typeof existing === 'object') {
        return res.status(200).json({
          success: true,
          baseFee: existing.baseFee ?? DEFAULT_SETTINGS.baseFee,
          includedItems: Array.isArray(existing.includedItems) ? existing.includedItems : DEFAULT_SETTINGS.includedItems
        });
      }
      return res.status(200).json({
        success: true,
        baseFee: DEFAULT_SETTINGS.baseFee,
        includedItems: DEFAULT_SETTINGS.includedItems
      });
    }

    if (req.method === 'PUT') {
      const baseFeeRaw = req.body?.baseFee;
      const includedItemsRaw = req.body?.includedItems;
      const existing = await readSetting();

      const next = {
        baseFee: typeof existing === 'object' && existing.baseFee !== undefined ? existing.baseFee : DEFAULT_SETTINGS.baseFee,
        includedItems: typeof existing === 'object' && Array.isArray(existing.includedItems)
          ? existing.includedItems
          : DEFAULT_SETTINGS.includedItems
      };

      if (baseFeeRaw !== undefined) {
        const baseFee = Number(baseFeeRaw);
        if (Number.isNaN(baseFee)) {
          return res.status(400).json({ success: false, error: 'Invalid baseFee' });
        }
        next.baseFee = baseFee;
      }

      if (Array.isArray(includedItemsRaw)) {
        next.includedItems = includedItemsRaw
          .map((item) => String(item).trim())
          .filter(Boolean);
      }

      await writeSetting(next);
      return res.status(200).json({
        success: true,
        baseFee: next.baseFee,
        includedItems: next.includedItems
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Entry fee settings API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      details: error.message
    });
  }
}
