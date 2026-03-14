// Upsell products API — returns team-specific high-margin items (hoodies, scuba tops)
// Used on checkout page as a "last chance" upsell prompt before payment

import { query } from '../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { teamId } = req.query;

  if (!teamId) {
    return res.status(200).json({ products: [] });
  }

  try {
    // Resolve team name from team ID
    const teamResult = await query('SELECT team_name FROM teams WHERE id = $1', [parseInt(teamId)]);
    const teamName = teamResult.rows[0]?.team_name;
    if (!teamName) {
      return res.status(200).json({ products: [] });
    }

    // Get team-specific Hoodie and Scuba from coach-apparel category
    const result = await query(
      `SELECT id, name, price, image, images, sizes, category
       FROM products
       WHERE active = true
         AND (sold_out IS NOT TRUE)
         AND category = 'coach-apparel'
         AND name ILIKE $1 || ' %'
         AND (name ILIKE '%Hoodie' OR name ILIKE '%Scuba')
       ORDER BY price DESC
       LIMIT 2`,
      [teamName]
    );

    const products = result.rows.map(row => ({
      id: row.id,
      product_name: row.name,
      sell_price: parseFloat(row.price),
      image_url: row.image || (row.images && row.images[0]) || '/images/placeholder.svg',
      sizes: row.sizes || [],
      category: row.category
    }));

    return res.status(200).json({ products });
  } catch (error) {
    console.error('Error fetching upsell products:', error);
    // Fail safe — never block checkout
    return res.status(200).json({ products: [] });
  }
}
