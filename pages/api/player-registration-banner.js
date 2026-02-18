import { query } from '../../lib/db';
import { getFormTemplateById } from '../../data/forms';

const SETTINGS_KEY = 'player_registration_banner';

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
  // Seed default: reuse team banner image if available, with player-specific text
  let teamImageUrl = '';
  try {
    const teamRes = await query('SELECT value FROM site_settings WHERE key = $1', ['team_registration_banner']);
    if (teamRes.rows.length > 0) {
      const rawVal = teamRes.rows[0].value;
      const teamBanner = typeof rawVal === 'string' ? JSON.parse(rawVal) : rawVal;
      teamImageUrl = teamBanner?.imageUrl || '';
    }
  } catch (e) {
    // ignore - just use empty image
  }

  const defaultBanner = {
    imageUrl: teamImageUrl,
    title: 'Welcome to Player Registration',
    subtitle: 'Register as a player and get equipped for the season ahead',
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
    console.error('Player registration banner API error:', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}
