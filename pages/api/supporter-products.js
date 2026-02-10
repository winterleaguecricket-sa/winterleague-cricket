import crypto from 'crypto';
import { query } from '../../lib/db';
import { getSupporterProducts as getDefaultSupporterProducts } from '../../data/supporterProducts';

const SETTINGS_KEY = 'supporter_products';

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

async function getProductsWithSeed() {
  const existing = await readSetting();
  if (existing && Array.isArray(existing)) {
    return existing;
  }
  const defaults = getDefaultSupporterProducts(false);
  await writeSetting(defaults);
  return defaults;
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const products = await getProductsWithSeed();
      return res.status(200).json({ success: true, products });
    }

    if (req.method === 'POST') {
      const products = await getProductsWithSeed();
      const newProduct = {
        id: crypto.randomUUID(),
        name: req.body?.name || '',
        description: req.body?.description || '',
        price: parseFloat(req.body?.price || 0),
        sizeOptions: req.body?.sizeOptions || [],
        active: req.body?.active !== false,
        imageUrl: req.body?.imageUrl || ''
      };
      products.push(newProduct);
      await writeSetting(products);
      return res.status(200).json({ success: true, product: newProduct });
    }

    if (req.method === 'PUT') {
      const { id, updates } = req.body || {};
      const products = await getProductsWithSeed();
      const index = products.findIndex((p) => p.id === id);
      if (index === -1) {
        return res.status(404).json({ success: false, error: 'Product not found' });
      }
      const incoming = updates || req.body || {};
      products[index] = {
        ...products[index],
        ...incoming,
        price: incoming.price !== undefined ? parseFloat(incoming.price) : products[index].price
      };
      await writeSetting(products);
      return res.status(200).json({ success: true, product: products[index] });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      const products = await getProductsWithSeed();
      const filtered = products.filter((p) => p.id !== id);
      await writeSetting(filtered);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Supporter products API error:', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}
