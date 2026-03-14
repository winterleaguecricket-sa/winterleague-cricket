// Supplier Product Management API
// Suppliers can create/edit/delete their own products; sets supplier_cost, admin sets price on approval
import { query } from '../../lib/db';
import fs from 'fs';
import path from 'path';

export const config = {
  api: { bodyParser: { sizeLimit: '50mb' } }
};

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads', 'products');

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function saveBase64Image(dataUrl, productId, imageIndex) {
  if (!dataUrl || typeof dataUrl !== 'string') return '/images/placeholder.svg';
  if (!dataUrl.startsWith('data:')) return dataUrl;
  const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) return '/images/placeholder.svg';
  ensureUploadsDir();
  const ext = match[1] === 'image/png' ? 'png' : match[1] === 'image/webp' ? 'webp' : 'jpg';
  const fileName = `supplier_${productId}_${imageIndex}_${Date.now()}.${ext}`;
  const filePath = path.join(UPLOADS_DIR, fileName);
  try {
    fs.writeFileSync(filePath, Buffer.from(match[2], 'base64'));
    return `/uploads/products/${fileName}`;
  } catch (e) {
    console.error('Failed to save supplier product image:', e.message);
    return '/images/placeholder.svg';
  }
}

export default async function handler(req, res) {
  try {
    const { method } = req;

    // ─── GET: List supplier's products ───────────────────────
    if (method === 'GET') {
      const { supplierId, status } = req.query;
      if (!supplierId) return res.status(400).json({ success: false, error: 'supplierId required' });

      // Admin mode returns empty results (admin doesn't have products)
      if (supplierId === 'admin') {
        return res.json({ success: true, products: [], counts: { pending: 0, approved: 0, rejected: 0 } });
      }

      // Verify supplier exists
      const sup = await query('SELECT id FROM suppliers WHERE id = $1', [supplierId]);
      if (sup.rows.length === 0 && supplierId !== 'admin') {
        return res.status(404).json({ success: false, error: 'Supplier not found' });
      }

      let sql = `SELECT id, name, category, price, supplier_cost, description, stock, sizes, images, image,
                        approval_status, approval_notes, quality_rating, supplier_sku, low_stock_threshold,
                        total_sold, featured, active, created_at
                 FROM products WHERE supplier_id = $1`;
      const params = [supplierId];

      if (status && ['pending', 'approved', 'rejected'].includes(status)) {
        sql += ` AND approval_status = $2`;
        params.push(status);
      }
      sql += ' ORDER BY created_at DESC';

      const result = await query(sql, params);
      const products = result.rows.map(r => ({
        id: r.id,
        name: r.name,
        category: r.category,
        price: r.price ? parseFloat(r.price) : null,
        supplierCost: r.supplier_cost ? parseFloat(r.supplier_cost) : 0,
        description: r.description || '',
        stock: r.stock || 0,
        sizes: r.sizes || [],
        images: r.images || [],
        image: r.image || (r.images && r.images[0]) || '/images/placeholder.svg',
        approvalStatus: r.approval_status || 'pending',
        approvalNotes: r.approval_notes || '',
        qualityRating: r.quality_rating,
        supplierSku: r.supplier_sku || '',
        lowStockThreshold: r.low_stock_threshold || 5,
        totalSold: r.total_sold || 0,
        featured: r.featured || false,
        active: r.active !== false,
        createdAt: r.created_at
      }));

      // Get counts by status
      const countResult = await query(
        `SELECT approval_status, COUNT(*)::int as count FROM products WHERE supplier_id = $1 GROUP BY approval_status`,
        [supplierId]
      );
      const counts = { pending: 0, approved: 0, rejected: 0 };
      countResult.rows.forEach(r => { counts[r.approval_status] = r.count; });

      return res.json({ success: true, products, counts });
    }

    // ─── POST: Create or update product ──────────────────────
    if (method === 'POST') {
      const { action, supplierId } = req.body;
      if (!supplierId) return res.status(400).json({ success: false, error: 'supplierId required' });
      if (supplierId === 'admin') return res.status(400).json({ success: false, error: 'Admin mode cannot manage products' });

      // ── Create product ──
      if (action === 'create') {
        const { name, category, supplierCost, description, stock, sizes, images, supplierSku, lowStockThreshold } = req.body;

        if (!name || !category || supplierCost === undefined || supplierCost === '') {
          return res.status(400).json({ success: false, error: 'Name, category, and cost price are required' });
        }

        const costVal = parseFloat(supplierCost);
        if (isNaN(costVal) || costVal < 0) {
          return res.status(400).json({ success: false, error: 'Invalid cost price' });
        }

        // Insert with approval_status = 'pending' — admin sets price on approval
        const insertResult = await query(
          `INSERT INTO products (name, category, supplier_cost, description, stock, sizes, images, image,
                                 supplier_id, supplier_sku, low_stock_threshold, approval_status, active, price, cost)
           VALUES ($1, $2, $3, $4, $5, $6, '[]', '/images/placeholder.svg',
                   $7, $8, $9, 'pending', false, 0, $3)
           RETURNING *`,
          [
            name.trim(),
            category,
            costVal,
            (description || '').trim(),
            parseInt(stock) || 0,
            JSON.stringify(sizes || []),
            supplierId,
            (supplierSku || '').trim(),
            parseInt(lowStockThreshold) || 5
          ]
        );

        const newProduct = insertResult.rows[0];
        const productId = newProduct.id;

        // Process images
        let normalizedImages = Array.isArray(images) && images.length > 0 ? images : [];
        if (normalizedImages.length > 0) {
          const savedImages = normalizedImages.map((img, idx) => saveBase64Image(img, productId, idx));
          const coverImage = savedImages[0] || '/images/placeholder.svg';
          await query('UPDATE products SET images = $1, image = $2 WHERE id = $3',
            [JSON.stringify(savedImages), coverImage, productId]);
        }

        return res.status(201).json({ success: true, message: 'Product submitted for approval' });
      }

      // ── Update product ──
      if (action === 'update') {
        const { productId, name, category, supplierCost, description, stock, sizes, images, supplierSku, lowStockThreshold } = req.body;
        if (!productId) return res.status(400).json({ success: false, error: 'productId required' });

        // Verify ownership
        const existing = await query('SELECT * FROM products WHERE id = $1 AND supplier_id = $2', [productId, supplierId]);
        if (existing.rows.length === 0) return res.status(404).json({ success: false, error: 'Product not found' });

        const old = existing.rows[0];
        const costVal = supplierCost !== undefined ? parseFloat(supplierCost) : parseFloat(old.supplier_cost);

        // If product was approved and cost changes, revert to pending
        const costChanged = supplierCost !== undefined && costVal !== parseFloat(old.supplier_cost);
        const newStatus = costChanged && old.approval_status === 'approved' ? 'pending' : old.approval_status;

        await query(
          `UPDATE products SET name = $1, category = $2, supplier_cost = $3, description = $4,
           stock = $5, sizes = $6, supplier_sku = $7, low_stock_threshold = $8,
           approval_status = $9, cost = $3
           WHERE id = $10 AND supplier_id = $11`,
          [
            (name || old.name).trim(),
            category || old.category,
            costVal,
            (description !== undefined ? description : old.description || '').trim(),
            stock !== undefined ? parseInt(stock) || 0 : old.stock,
            JSON.stringify(sizes || old.sizes || []),
            (supplierSku !== undefined ? supplierSku : old.supplier_sku || '').trim(),
            lowStockThreshold !== undefined ? parseInt(lowStockThreshold) || 5 : old.low_stock_threshold || 5,
            newStatus,
            productId,
            supplierId
          ]
        );

        // Process new images if provided
        if (Array.isArray(images) && images.length > 0) {
          const hasNewBase64 = images.some(img => typeof img === 'string' && img.startsWith('data:'));
          if (hasNewBase64) {
            const savedImages = images.map((img, idx) => saveBase64Image(img, productId, idx));
            const coverImage = savedImages[0] || '/images/placeholder.svg';
            await query('UPDATE products SET images = $1, image = $2 WHERE id = $3',
              [JSON.stringify(savedImages), coverImage, productId]);
          }
        }

        return res.json({ success: true, message: costChanged ? 'Product updated — re-submitted for approval due to cost change' : 'Product updated' });
      }

      // ── Delete (deactivate) product ──
      if (action === 'delete') {
        const { productId } = req.body;
        if (!productId) return res.status(400).json({ success: false, error: 'productId required' });

        const existing = await query('SELECT id FROM products WHERE id = $1 AND supplier_id = $2', [productId, supplierId]);
        if (existing.rows.length === 0) return res.status(404).json({ success: false, error: 'Product not found' });

        await query('UPDATE products SET active = false WHERE id = $1 AND supplier_id = $2', [productId, supplierId]);
        return res.json({ success: true, message: 'Product removed' });
      }

      // ── Resubmit rejected product ──
      if (action === 'resubmit') {
        const { productId } = req.body;
        if (!productId) return res.status(400).json({ success: false, error: 'productId required' });

        const existing = await query(
          'SELECT id, approval_status FROM products WHERE id = $1 AND supplier_id = $2',
          [productId, supplierId]
        );
        if (existing.rows.length === 0) return res.status(404).json({ success: false, error: 'Product not found' });
        if (existing.rows[0].approval_status !== 'rejected') {
          return res.status(400).json({ success: false, error: 'Only rejected products can be resubmitted' });
        }

        await query(
          `UPDATE products SET approval_status = 'pending', approval_notes = NULL WHERE id = $1 AND supplier_id = $2`,
          [productId, supplierId]
        );
        return res.json({ success: true, message: 'Product resubmitted for approval' });
      }

      return res.status(400).json({ success: false, error: 'Invalid action' });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    console.error('Supplier products API error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}
