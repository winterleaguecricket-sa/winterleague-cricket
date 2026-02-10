// API endpoint for products CRUD operations - PostgreSQL backed
import { query } from '../../lib/db';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb'
    }
  }
};

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads', 'products');

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

/**
 * Save a base64 data URL to a file and return the public path.
 * If it's already a file path, return as-is.
 */
function saveBase64Image(dataUrl, productId, imageIndex) {
  if (!dataUrl || typeof dataUrl !== 'string') return '/images/placeholder.svg';
  if (!dataUrl.startsWith('data:')) return dataUrl; // already a file path

  const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) return '/images/placeholder.svg';

  ensureUploadsDir();
  const mimeType = match[1];
  const data = match[2];
  const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
  const timestamp = Date.now();
  const fileName = `product_${productId}_${imageIndex}_${timestamp}.${ext}`;
  const filePath = path.join(UPLOADS_DIR, fileName);

  try {
    fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
    return `/uploads/products/${fileName}`;
  } catch (error) {
    console.error(`Failed to save image for product ${productId}:`, error.message);
    return '/images/placeholder.svg';
  }
}

/**
 * Map a DB row to the product shape expected by the frontend.
 * DB uses snake_case (design_id), frontend expects camelCase (designId).
 */
function rowToProduct(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: parseFloat(row.price),
    cost: row.cost !== null && row.cost !== undefined ? parseFloat(row.cost) : 0,
    description: row.description || '',
    stock: row.stock || 0,
    featured: row.featured || false,
    sizes: row.sizes || [],
    images: row.images || [],
    image: row.image || (row.images && row.images[0]) || '/images/placeholder.svg',
    designId: row.design_id || null
  };
}

/**
 * Return a lite version of a product (for listing, no heavy data).
 */
function productToLite(product, allowImages) {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    price: product.price,
    stock: product.stock,
    featured: product.featured,
    sizes: product.sizes || [],
    image: allowImages
      ? (product.image || (product.images && product.images[0]) || '/images/placeholder.svg')
      : '/images/placeholder.svg',
    images: allowImages
      ? (product.images && product.images.length > 0
        ? [product.images[0]]
        : undefined)
      : undefined,
    designId: product.designId || null
  };
}

export default async function handler(req, res) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET': {
        const { category, featured, lite, noImages, id } = req.query;

        // Get single product by ID
        if (id) {
          const result = await query('SELECT * FROM products WHERE id = $1 AND active = true', [parseInt(id)]);
          if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Product not found' });
          }
          return res.status(200).json({ success: true, product: rowToProduct(result.rows[0]) });
        }

        // Build query for listing
        let sql = 'SELECT * FROM products WHERE active = true';
        const params = [];
        let paramIdx = 1;

        if (category) {
          sql += ` AND category = $${paramIdx++}`;
          params.push(category);
        }
        if (featured === 'true') {
          sql += ' AND featured = true';
        }

        sql += ' ORDER BY id ASC';

        const result = await query(sql, params);
        let products = result.rows.map(rowToProduct);

        if (lite === 'true') {
          const allowImages = noImages !== 'true';
          products = products.map(p => productToLite(p, allowImages));
        }

        return res.status(200).json({ success: true, products });
      }

      case 'POST': {
        const { name, category, price, cost, description, stock, featured, sizes, image, images, designId } = req.body;

        if (!name || !category || price === undefined) {
          return res.status(400).json({ success: false, error: 'Name, category, and price are required' });
        }

        // Insert first to get the ID
        const insertResult = await query(
          `INSERT INTO products (name, category, price, cost, description, stock, featured, sizes, images, image, design_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING *`,
          [
            name,
            category,
            parseFloat(price),
            cost !== undefined && cost !== null && cost !== '' ? parseFloat(cost) : 0,
            description || '',
            parseInt(stock) || 0,
            featured || false,
            JSON.stringify(sizes || []),
            '[]',
            '/images/placeholder.svg',
            designId || null
          ]
        );

        const newProduct = insertResult.rows[0];
        const productId = newProduct.id;

        // Process images - save base64 to files
        let normalizedImages = Array.isArray(images) && images.length > 0
          ? images
          : (image ? [image] : []);

        const savedImages = normalizedImages.map((img, idx) => saveBase64Image(img, productId, idx));
        const coverImage = savedImages[0] || '/images/placeholder.svg';

        // Update with processed images
        await query(
          'UPDATE products SET images = $1, image = $2 WHERE id = $3',
          [JSON.stringify(savedImages), coverImage, productId]
        );

        const product = rowToProduct({
          ...newProduct,
          images: savedImages,
          image: coverImage
        });

        // Return all products for admin refresh
        const allResult = await query('SELECT * FROM products WHERE active = true ORDER BY id ASC');
        const allProducts = allResult.rows.map(rowToProduct);

        return res.status(201).json({ success: true, product, products: allProducts });
      }

      case 'PUT': {
        const { id, ...updates } = req.body;

        if (!id) {
          return res.status(400).json({ success: false, error: 'Product ID is required' });
        }

        const productId = parseInt(id);

        // Get existing product
        const existing = await query('SELECT * FROM products WHERE id = $1', [productId]);
        if (existing.rows.length === 0) {
          return res.status(404).json({ success: false, error: 'Product not found' });
        }

        const old = existing.rows[0];

        // Process images
        let updatedImages;
        if (Array.isArray(updates.images) && updates.images.length > 0) {
          updatedImages = updates.images;
        } else if (updates.image) {
          updatedImages = [updates.image];
        } else {
          updatedImages = old.images || [];
        }

        // Save any new base64 images to files
        const savedImages = updatedImages.map((img, idx) => saveBase64Image(img, productId, idx));
        const coverImage = savedImages[0] || updates.image || old.image || '/images/placeholder.svg';

        const result = await query(
          `UPDATE products SET
            name = $1, category = $2, price = $3, cost = $4,
            description = $5, stock = $6, featured = $7,
            sizes = $8, images = $9, image = $10, design_id = $11
          WHERE id = $12
          RETURNING *`,
          [
            updates.name !== undefined ? updates.name : old.name,
            updates.category !== undefined ? updates.category : old.category,
            updates.price !== undefined ? parseFloat(updates.price) : parseFloat(old.price),
            updates.cost !== undefined && updates.cost !== null && updates.cost !== ''
              ? parseFloat(updates.cost)
              : (old.cost !== null ? parseFloat(old.cost) : 0),
            updates.description !== undefined ? updates.description : (old.description || ''),
            updates.stock !== undefined ? parseInt(updates.stock) : old.stock,
            updates.featured !== undefined ? updates.featured : old.featured,
            JSON.stringify(updates.sizes !== undefined ? updates.sizes : (old.sizes || [])),
            JSON.stringify(savedImages),
            coverImage,
            updates.designId !== undefined ? updates.designId : old.design_id,
            productId
          ]
        );

        const updatedProduct = rowToProduct(result.rows[0]);

        // Return all products for admin refresh
        const allResult = await query('SELECT * FROM products WHERE active = true ORDER BY id ASC');
        const allProducts = allResult.rows.map(rowToProduct);

        return res.status(200).json({ success: true, product: updatedProduct, products: allProducts });
      }

      case 'DELETE': {
        const { id } = req.query;

        if (!id) {
          return res.status(400).json({ success: false, error: 'Product ID is required' });
        }

        const productId = parseInt(id);

        // Soft delete - mark as inactive
        const result = await query('UPDATE products SET active = false WHERE id = $1 RETURNING id', [productId]);

        if (result.rows.length === 0) {
          return res.status(404).json({ success: false, error: 'Product not found' });
        }

        // Return remaining active products
        const allResult = await query('SELECT * FROM products WHERE active = true ORDER BY id ASC');
        const allProducts = allResult.rows.map(rowToProduct);

        return res.status(200).json({ success: true, products: allProducts });
      }

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ success: false, error: `Method ${method} Not Allowed` });
    }
  } catch (error) {
    console.error('Products API error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
