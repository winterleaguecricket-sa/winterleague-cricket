#!/usr/bin/env node
/**
 * Migration script: Move products from products.json to PostgreSQL
 * 
 * 1. Reads all products from data/products.json
 * 2. Extracts base64 images to files in public/uploads/products/
 * 3. Drops old UUID-based products table, recreates with integer IDs
 * 4. Inserts all products into PostgreSQL
 * 
 * Run on the server: node migrate-products-to-db.js
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  database: 'winterleague_cricket',
  user: 'winterleague_user',
  password: 'Bailey&Love2015!',
  port: 5432
});

const PRODUCTS_JSON = path.join(__dirname, 'data', 'products.json');
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads', 'products');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function saveBase64ToFile(base64String, productId, imageIndex) {
  if (!base64String || typeof base64String !== 'string' || !base64String.startsWith('data:')) {
    return base64String || '/images/placeholder.svg';
  }
  const match = base64String.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) return '/images/placeholder.svg';

  const mimeType = match[1];
  const data = match[2];
  const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
  const fileName = `product_${productId}_${imageIndex}.${ext}`;
  const filePath = path.join(UPLOADS_DIR, fileName);

  try {
    fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
    const sizeKB = (data.length * 0.75 / 1024).toFixed(0);
    console.log(`  Saved: ${fileName} (${sizeKB}KB)`);
    return `/uploads/products/${fileName}`;
  } catch (error) {
    console.error(`  Failed to save image for product ${productId}:`, error.message);
    return '/images/placeholder.svg';
  }
}

async function migrate() {
  console.log('=== Products Migration: JSON -> PostgreSQL ===\n');

  // 1. Read products.json
  if (!fs.existsSync(PRODUCTS_JSON)) {
    console.error('ERROR: data/products.json not found!');
    process.exit(1);
  }

  console.log('Reading products.json...');
  const rawData = fs.readFileSync(PRODUCTS_JSON, 'utf8');
  const jsonData = JSON.parse(rawData);
  const products = jsonData.products || [];
  const idCounter = jsonData.idCounter || 87;
  console.log(`Found ${products.length} products, idCounter: ${idCounter}\n`);

  // 2. Ensure uploads directory
  ensureDir(UPLOADS_DIR);

  // 3. Extract images
  console.log('Extracting base64 images to files...');
  const processedProducts = products.map(product => {
    const images = [];
    if (Array.isArray(product.images) && product.images.length > 0) {
      product.images.forEach((img, idx) => {
        images.push(saveBase64ToFile(img, product.id, idx));
      });
    } else if (product.image) {
      images.push(saveBase64ToFile(product.image, product.id, 0));
    }

    return {
      id: product.id,
      name: product.name || '',
      category: product.category || 'premium',
      price: parseFloat(product.price) || 0,
      cost: product.cost !== undefined && product.cost !== null ? parseFloat(product.cost) : 0,
      description: product.description || '',
      stock: parseInt(product.stock) || 0,
      featured: product.featured || false,
      sizes: Array.isArray(product.sizes) ? product.sizes : [],
      images: images,
      image: images[0] || '/images/placeholder.svg',
      designId: product.designId || null
    };
  });

  console.log(`\nProcessed ${processedProducts.length} products\n`);

  // 4. Recreate the products table
  console.log('Recreating products table...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Drop FK from order_items (empty table)
    await client.query('ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_product_id_fkey');

    // Drop old table
    await client.query('DROP TABLE IF EXISTS products CASCADE');

    // Create new table with integer IDs
    await client.query(`
      CREATE TABLE products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        price NUMERIC(10,2) NOT NULL DEFAULT 0,
        cost NUMERIC(10,2) DEFAULT 0,
        description TEXT DEFAULT '',
        stock INTEGER DEFAULT 0,
        featured BOOLEAN DEFAULT false,
        sizes JSONB DEFAULT '[]'::jsonb,
        images JSONB DEFAULT '[]'::jsonb,
        image TEXT DEFAULT '/images/placeholder.svg',
        design_id INTEGER,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query('CREATE INDEX idx_products_category ON products(category)');
    await client.query('CREATE INDEX idx_products_active ON products(active)');
    await client.query('CREATE INDEX idx_products_design_id ON products(design_id)');

    // Recreate trigger
    await client.query(`
      CREATE OR REPLACE TRIGGER update_products_updated_at
        BEFORE UPDATE ON products
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `);

    // 5. Insert all products
    console.log('Inserting products...');
    let inserted = 0;
    for (const p of processedProducts) {
      await client.query(`
        INSERT INTO products (id, name, category, price, cost, description, stock, featured, sizes, images, image, design_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        p.id, p.name, p.category, p.price, p.cost, p.description,
        p.stock, p.featured,
        JSON.stringify(p.sizes), JSON.stringify(p.images),
        p.image, p.designId
      ]);
      inserted++;
    }

    // Set sequence so new products get the right next ID
    await client.query(`SELECT setval('products_id_seq', $1)`, [idCounter]);

    await client.query('COMMIT');
    console.log(`\n✓ Inserted ${inserted} products`);
    console.log(`✓ Sequence set to ${idCounter}`);

    // 6. Verify
    const count = await client.query('SELECT COUNT(*) FROM products');
    const sample = await client.query('SELECT id, name, category, price, design_id, image FROM products ORDER BY id LIMIT 10');

    console.log(`\n=== Verification ===`);
    console.log(`Total in DB: ${count.rows[0].count}`);
    console.log('\nSample:');
    sample.rows.forEach(r => {
      console.log(`  ID ${r.id}: ${r.name} | ${r.category} | R${r.price} | designId=${r.design_id || 'none'} | img=${r.image}`);
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\nMIGRATION FAILED - rolled back:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    client.release();
  }

  await pool.end();
  console.log('\n=== Migration Complete ===');
}

migrate().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
