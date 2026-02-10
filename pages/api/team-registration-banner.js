import { query } from '../../lib/db';
import { getFormTemplateById } from '../../data/forms';

const SETTINGS_KEY = 'team_registration_banner';

async function readSetting() {
  const res = await query('SELECT value FROM site_settings WHERE key = $1', [SETTINGS_KEY]);
  if (res.rows.length > 0) {
    return res.rows[0].value;
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

async function getBannerWithSeed() {
  const existing = await readSetting();
  if (existing) {
    return existing;
  }
  const form = getFormTemplateById(1);
  const defaultBanner = form?.welcomeBanner || {
    imageUrl: '',
    title: 'Welcome to Team Registration',
    subtitle: 'Register your team and prepare for the season',
    showOnPage: 1
  };
  await writeSetting(defaultBanner);
  return defaultBanner;
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const banner = await getBannerWithSeed();
      return res.status(200).json({ success: true, banner });
    }

    if (req.method === 'PUT') {
      const banner = req.body?.banner || req.body || {};
      const updated = {
        imageUrl: banner.imageUrl || '',
        title: banner.title || '',
        subtitle: banner.subtitle || '',
        showOnPage: banner.showOnPage || 1
      };
      await writeSetting(updated);
      return res.status(200).json({ success: true, banner: updated });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Team registration banner API error:', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}
