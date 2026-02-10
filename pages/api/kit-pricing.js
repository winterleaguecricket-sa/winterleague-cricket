import { query } from '../../lib/db';

const SETTINGS_KEY = 'kit_base_price';
const DEFAULT_INCLUDED_ITEMS = [
  'Full season league participation',
  'Official league jersey',
  'League insurance coverage',
  'Access to league facilities'
];

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
      if (existing !== null && existing !== undefined) {
        const basePrice = typeof existing === 'object' ? existing.basePrice : existing;
        const includedItems = typeof existing === 'object' && Array.isArray(existing.includedItems)
          ? existing.includedItems
          : DEFAULT_INCLUDED_ITEMS;
        return res.status(200).json({ success: true, basePrice, includedItems });
      }
      return res.status(200).json({
        success: true,
        basePrice: 150,
        includedItems: DEFAULT_INCLUDED_ITEMS
      });
    }

    if (req.method === 'PUT') {
      const basePriceRaw = req.body?.basePrice;
      const includedItemsRaw = req.body?.includedItems;
      const existing = await readSetting();

      const next = {
        basePrice: typeof existing === 'object' && existing.basePrice !== undefined ? existing.basePrice : 150,
        includedItems: typeof existing === 'object' && Array.isArray(existing.includedItems)
          ? existing.includedItems
          : DEFAULT_INCLUDED_ITEMS
      };

      if (basePriceRaw !== undefined) {
        const basePrice = Number(basePriceRaw);
        if (Number.isNaN(basePrice)) {
          return res.status(400).json({ success: false, error: 'Invalid basePrice' });
        }
        next.basePrice = basePrice;
      }

      if (Array.isArray(includedItemsRaw)) {
        next.includedItems = includedItemsRaw.filter(Boolean).map((item) => String(item).trim()).filter(Boolean);
      }

      await writeSetting(next);
      return res.status(200).json({
        success: true,
        basePrice: next.basePrice,
        includedItems: next.includedItems
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Kit pricing API error:', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}
