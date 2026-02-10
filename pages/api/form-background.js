import { query } from '../../lib/db';

const SETTINGS_KEY_PREFIX = 'form_background_';

async function readSetting(formId) {
  const key = `${SETTINGS_KEY_PREFIX}${formId}`;
  const res = await query('SELECT value FROM site_settings WHERE key = $1', [key]);
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

async function writeSetting(formId, value) {
  const key = `${SETTINGS_KEY_PREFIX}${formId}`;
  await query(
    `INSERT INTO site_settings (key, value)
     VALUES ($1, $2)
     ON CONFLICT (key)
     DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
    [key, JSON.stringify(value)]
  );
}

export default async function handler(req, res) {
  try {
    const { formId } = req.query;
    const targetFormId = formId || req.body?.formId;

    if (!targetFormId) {
      return res.status(400).json({ success: false, error: 'formId is required' });
    }

    if (req.method === 'GET') {
      const existing = await readSetting(targetFormId);
      if (existing) {
        const normalized = typeof existing === 'string'
          ? { imageUrl: existing }
          : existing;
        return res.status(200).json({ success: true, background: normalized });
      }
      return res.status(200).json({ success: true, background: { imageUrl: '' } });
    }

    if (req.method === 'PUT') {
      const background = req.body?.background || req.body || {};
      const updated = {
        imageUrl: background.imageUrl || '',
        transparencyEnabled: !!background.transparencyEnabled
      };
      await writeSetting(targetFormId, updated);
      return res.status(200).json({ success: true, background: updated });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Form background API error:', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}
