import { query } from '../../lib/db';

const SETTINGS_KEY = 'kit_size_charts';
const DEFAULT_SETTINGS = {
  shirtChartUrl: '',
  pantsChartUrl: ''
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
          shirtChartUrl: existing.shirtChartUrl || '',
          pantsChartUrl: existing.pantsChartUrl || ''
        });
      }
      return res.status(200).json({
        success: true,
        ...DEFAULT_SETTINGS
      });
    }

    if (req.method === 'PUT') {
      const shirtChartUrl = typeof req.body?.shirtChartUrl === 'string' ? req.body.shirtChartUrl.trim() : undefined;
      const pantsChartUrl = typeof req.body?.pantsChartUrl === 'string' ? req.body.pantsChartUrl.trim() : undefined;
      const existing = await readSetting();
      const hasExisting = existing && typeof existing === 'object';

      const next = {
        shirtChartUrl: hasExisting && existing.shirtChartUrl ? existing.shirtChartUrl : '',
        pantsChartUrl: hasExisting && existing.pantsChartUrl ? existing.pantsChartUrl : ''
      };

      if (shirtChartUrl !== undefined) {
        next.shirtChartUrl = shirtChartUrl;
      }
      if (pantsChartUrl !== undefined) {
        next.pantsChartUrl = pantsChartUrl;
      }

      await writeSetting(next);
      return res.status(200).json({
        success: true,
        shirtChartUrl: next.shirtChartUrl,
        pantsChartUrl: next.pantsChartUrl
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Kit size charts API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      details: error.message
    });
  }
}