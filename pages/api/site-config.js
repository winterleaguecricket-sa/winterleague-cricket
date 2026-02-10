import fs from 'fs';
import path from 'path';
import { siteConfig as defaultConfig } from '../../data/products';

const DATA_FILE = path.join(process.cwd(), 'data', 'siteConfig.json');

function loadConfig() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (error) {
    console.error('Error reading siteConfig.json:', error);
  }
  return JSON.parse(JSON.stringify(defaultConfig));
}

function saveConfig(config) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing siteConfig.json:', error);
    return false;
  }
}

export default function handler(req, res) {
  if (req.method === 'GET') {
    const config = loadConfig();
    return res.status(200).json({ success: true, config });
  }

  if (req.method === 'PUT') {
    const existing = loadConfig();
    const incoming = req.body?.config || req.body || {};

    const merged = {
      ...existing,
      ...incoming,
      buttonFunnels: {
        ...(existing.buttonFunnels || {}),
        ...(incoming.buttonFunnels || {})
      },
      paymentConfig: {
        ...(existing.paymentConfig || {}),
        ...(incoming.paymentConfig || {})
      }
    };

    const saved = saveConfig(merged);
    if (!saved) {
      return res.status(500).json({ success: false, error: 'Failed to save site config' });
    }

    return res.status(200).json({ success: true, config: merged });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
