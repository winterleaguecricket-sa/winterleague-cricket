import { query } from '../../lib/db';

export default async function handler(req, res) {
  // ─── GET: List suppliers, stats, or pending products ─────
  if (req.method === 'GET') {
    const { view, supplierId, status, search } = req.query;

    // Dashboard stats
    if (view === 'stats') {
      try {
        const [suppliers, apps, products, orders] = await Promise.all([
          query(`SELECT 
            COUNT(*) FILTER (WHERE active = true) AS active_suppliers,
            COUNT(*) FILTER (WHERE active = true AND status = 'approved') AS approved_suppliers,
            COUNT(*) FILTER (WHERE active = false) AS inactive_suppliers,
            COALESCE(SUM(total_revenue) FILTER (WHERE active = true), 0) AS total_revenue
          FROM suppliers`),
          query(`SELECT 
            COUNT(*) FILTER (WHERE status = 'submitted') AS pending_apps,
            COUNT(*) FILTER (WHERE status = 'under_review') AS reviewing_apps,
            COUNT(*) FILTER (WHERE status = 'approved') AS approved_apps,
            COUNT(*) FILTER (WHERE status = 'rejected') AS rejected_apps,
            COUNT(*) AS total_apps
          FROM supplier_applications`),
          query(`SELECT 
            COUNT(*) FILTER (WHERE approval_status = 'pending' AND supplier_id IS NOT NULL) AS pending_products,
            COUNT(*) FILTER (WHERE approval_status = 'approved' AND supplier_id IS NOT NULL) AS approved_products,
            COUNT(*) FILTER (WHERE approval_status = 'rejected' AND supplier_id IS NOT NULL) AS rejected_products,
            COUNT(*) FILTER (WHERE supplier_id IS NOT NULL AND active = true) AS active_supplier_products
          FROM products`),
          query(`SELECT 
            COUNT(*) AS total_orders,
            COALESCE(SUM(supplier_amount), 0) AS total_supplier_earnings,
            COALESCE(SUM(admin_margin), 0) AS total_admin_margin,
            COALESCE(SUM(team_commission), 0) AS total_team_commission,
            COUNT(*) FILTER (WHERE fulfillment_status = 'pending') AS pending_orders,
            COUNT(*) FILTER (WHERE sla_breached = true) AS sla_breaches
          FROM supplier_orders`)
        ]);
        return res.status(200).json({
          suppliers: suppliers.rows[0],
          applications: apps.rows[0],
          products: products.rows[0],
          orders: orders.rows[0]
        });
      } catch (error) {
        console.error('Supplier stats error:', error);
        return res.status(500).json({ error: 'Failed to fetch stats' });
      }
    }

    // Single supplier detail
    if (supplierId) {
      try {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(supplierId)) return res.status(400).json({ error: 'Invalid supplier ID' });

        const [supplierResult, productsResult, ordersResult] = await Promise.all([
          query('SELECT * FROM suppliers WHERE id = $1', [supplierId]),
          query(`SELECT id, name, category, price, supplier_cost, approval_status, quality_rating, stock, active, created_at 
                 FROM products WHERE supplier_id = $1 ORDER BY created_at DESC`, [supplierId]),
          query(`SELECT id, order_number, subtotal, supplier_amount, admin_margin, team_commission, 
                        fulfillment_status, sla_breached, created_at
                 FROM supplier_orders WHERE supplier_id = $1 ORDER BY created_at DESC LIMIT 50`, [supplierId])
        ]);

        if (supplierResult.rows.length === 0) {
          return res.status(404).json({ error: 'Supplier not found' });
        }

        const s = supplierResult.rows[0];
        return res.status(200).json({
          supplier: {
            id: s.id, companyName: s.company_name, tradingName: s.trading_name,
            email: s.email, phone: s.phone, website: s.website,
            contactPersonName: s.contact_person_name, contactPersonEmail: s.contact_person_email,
            contactPersonPhone: s.contact_person_phone,
            businessRegistrationNumber: s.business_registration_number,
            companyType: s.company_type, vatNumber: s.vat_number, taxNumber: s.tax_number,
            bankName: s.bank_name, bankAccountNumber: s.bank_account_number,
            bankBranchCode: s.bank_branch_code, bankAccountType: s.bank_account_type,
            bankAccountHolder: s.bank_account_holder,
            physicalAddress: s.physical_address, city: s.city, province: s.province, postalCode: s.postal_code,
            logo: s.logo, description: s.description, returnPolicy: s.return_policy,
            categories: s.categories || [], payoutFrequency: s.payout_frequency, payoutDay: s.payout_day,
            slaTier: s.sla_tier, performanceTier: s.performance_tier,
            rating: parseFloat(s.rating || 0), totalSales: s.total_sales, totalRevenue: parseFloat(s.total_revenue || 0),
            slaComplianceRate: parseFloat(s.sla_compliance_rate || 100),
            featured: s.featured, status: s.status, active: s.active,
            approvedAt: s.approved_at, approvedBy: s.approved_by, lastLogin: s.last_login,
            createdAt: s.created_at, updatedAt: s.updated_at
          },
          products: productsResult.rows.map(p => ({
            id: p.id, name: p.name, category: p.category,
            price: parseFloat(p.price || 0), supplierCost: parseFloat(p.supplier_cost || 0),
            approvalStatus: p.approval_status, qualityRating: p.quality_rating,
            stock: p.stock, active: p.active, createdAt: p.created_at
          })),
          orders: ordersResult.rows.map(o => ({
            id: o.id, orderNumber: o.order_number,
            subtotal: parseFloat(o.subtotal || 0), supplierAmount: parseFloat(o.supplier_amount || 0),
            adminMargin: parseFloat(o.admin_margin || 0), teamCommission: parseFloat(o.team_commission || 0),
            fulfillmentStatus: o.fulfillment_status, slaBreached: o.sla_breached,
            createdAt: o.created_at
          }))
        });
      } catch (error) {
        console.error('Supplier detail error:', error);
        return res.status(500).json({ error: 'Failed to fetch supplier details' });
      }
    }

    // Pending products for approval
    if (view === 'pending-products') {
      try {
        const result = await query(`
          SELECT p.id, p.name, p.category, p.price, p.supplier_cost, p.description, p.stock,
                 p.sizes, p.images, p.image, p.approval_status, p.approval_notes, p.quality_rating,
                 p.supplier_sku, p.created_at,
                 s.company_name AS supplier_name, s.id AS supplier_id, s.email AS supplier_email
          FROM products p
          JOIN suppliers s ON p.supplier_id = s.id
          WHERE p.approval_status IN ('pending', 'rejected')
          ORDER BY 
            CASE WHEN p.approval_status = 'pending' THEN 0 ELSE 1 END,
            p.created_at DESC
        `);
        return res.status(200).json({
          products: result.rows.map(p => ({
            id: p.id, name: p.name, category: p.category,
            price: parseFloat(p.price || 0), supplierCost: parseFloat(p.supplier_cost || 0),
            description: p.description, stock: p.stock,
            sizes: p.sizes || [], images: p.images || [], image: p.image,
            approvalStatus: p.approval_status, approvalNotes: p.approval_notes,
            qualityRating: p.quality_rating, supplierSku: p.supplier_sku,
            supplierName: p.supplier_name, supplierId: p.supplier_id, supplierEmail: p.supplier_email,
            createdAt: p.created_at
          }))
        });
      } catch (error) {
        console.error('Pending products error:', error);
        return res.status(500).json({ error: 'Failed to fetch pending products' });
      }
    }

    // List all suppliers
    try {
      let sql = `
        SELECT s.*, 
          (SELECT COUNT(*) FROM products WHERE supplier_id = s.id AND active = true) AS product_count,
          (SELECT COUNT(*) FROM supplier_orders WHERE supplier_id = s.id) AS order_count,
          (SELECT COUNT(*) FROM products WHERE supplier_id = s.id AND approval_status = 'pending') AS pending_products
        FROM suppliers s
      `;
      const params = [];
      const conditions = [];

      if (status) {
        conditions.push(`s.status = $${params.length + 1}`);
        params.push(status);
      }
      if (search) {
        conditions.push(`(s.company_name ILIKE $${params.length + 1} OR s.email ILIKE $${params.length + 1} OR s.contact_person_name ILIKE $${params.length + 1})`);
        params.push(`%${search}%`);
      }
      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }
      sql += ' ORDER BY s.created_at DESC';

      const result = await query(sql, params);
      return res.status(200).json({
        suppliers: result.rows.map(s => ({
          id: s.id, companyName: s.company_name, tradingName: s.trading_name,
          email: s.email, phone: s.phone, contactPersonName: s.contact_person_name,
          slaTier: s.sla_tier, performanceTier: s.performance_tier,
          rating: parseFloat(s.rating || 0), totalSales: s.total_sales,
          totalRevenue: parseFloat(s.total_revenue || 0),
          slaComplianceRate: parseFloat(s.sla_compliance_rate || 100),
          featured: s.featured, status: s.status, active: s.active,
          categories: s.categories || [], payoutFrequency: s.payout_frequency,
          productCount: parseInt(s.product_count || 0),
          orderCount: parseInt(s.order_count || 0),
          pendingProducts: parseInt(s.pending_products || 0),
          createdAt: s.created_at, approvedAt: s.approved_at
        }))
      });
    } catch (error) {
      console.error('Supplier list error:', error);
      return res.status(500).json({ error: 'Failed to fetch suppliers' });
    }
  }

  // ─── POST: Admin actions on suppliers / products ─────────
  if (req.method === 'POST') {
    const { action } = req.body;

    // Update supplier SLA tier
    if (action === 'update-tier') {
      const { supplierId, slaTier } = req.body;
      if (!supplierId || !slaTier) return res.status(400).json({ error: 'Supplier ID and SLA tier required' });
      const validTiers = ['standard', 'premium', 'enterprise'];
      if (!validTiers.includes(slaTier)) return res.status(400).json({ error: 'Invalid SLA tier' });
      try {
        await query('UPDATE suppliers SET sla_tier = $1, updated_at = NOW() WHERE id = $2', [slaTier, supplierId]);
        return res.status(200).json({ success: true, message: `SLA tier updated to ${slaTier}` });
      } catch (error) {
        console.error('Update tier error:', error);
        return res.status(500).json({ error: 'Failed to update SLA tier' });
      }
    }

    // Toggle active status
    if (action === 'toggle-active') {
      const { supplierId, active } = req.body;
      if (!supplierId || typeof active !== 'boolean') return res.status(400).json({ error: 'Supplier ID and active status required' });
      try {
        await query('UPDATE suppliers SET active = $1, updated_at = NOW() WHERE id = $2', [active, supplierId]);
        return res.status(200).json({ success: true, message: active ? 'Supplier activated' : 'Supplier deactivated' });
      } catch (error) {
        console.error('Toggle active error:', error);
        return res.status(500).json({ error: 'Failed to update supplier status' });
      }
    }

    // Toggle featured
    if (action === 'toggle-featured') {
      const { supplierId, featured } = req.body;
      if (!supplierId || typeof featured !== 'boolean') return res.status(400).json({ error: 'Missing parameters' });
      try {
        await query('UPDATE suppliers SET featured = $1, updated_at = NOW() WHERE id = $2', [featured, supplierId]);
        return res.status(200).json({ success: true });
      } catch (error) {
        console.error('Toggle featured error:', error);
        return res.status(500).json({ error: 'Failed to update featured status' });
      }
    }

    // Approve a supplier product
    if (action === 'approve-product') {
      const { productId, sellPrice, qualityRating, notes } = req.body;
      if (!productId) return res.status(400).json({ error: 'Product ID required' });
      if (!sellPrice || sellPrice <= 0) return res.status(400).json({ error: 'Valid sell price required' });
      if (!qualityRating || qualityRating < 1 || qualityRating > 5) return res.status(400).json({ error: 'Quality rating must be 1-5' });
      try {
        await query(`
          UPDATE products SET 
            price = $1, quality_rating = $2, approval_status = 'approved',
            approval_notes = $3, approved_at = NOW(), approved_by = 'admin',
            active = true
          WHERE id = $4 AND supplier_id IS NOT NULL
        `, [sellPrice, qualityRating, notes || null, productId]);
        return res.status(200).json({ success: true, message: 'Product approved' });
      } catch (error) {
        console.error('Approve product error:', error);
        return res.status(500).json({ error: 'Failed to approve product' });
      }
    }

    // Reject a supplier product
    if (action === 'reject-product') {
      const { productId, notes } = req.body;
      if (!productId) return res.status(400).json({ error: 'Product ID required' });
      if (!notes) return res.status(400).json({ error: 'Rejection reason required' });
      try {
        await query(`
          UPDATE products SET 
            approval_status = 'rejected', approval_notes = $1, 
            approved_at = NOW(), approved_by = 'admin', active = false
          WHERE id = $2 AND supplier_id IS NOT NULL
        `, [notes, productId]);
        return res.status(200).json({ success: true, message: 'Product rejected' });
      } catch (error) {
        console.error('Reject product error:', error);
        return res.status(500).json({ error: 'Failed to reject product' });
      }
    }

    // Update supplier payout frequency
    if (action === 'update-payout') {
      const { supplierId, payoutFrequency } = req.body;
      if (!supplierId || !payoutFrequency) return res.status(400).json({ error: 'Missing parameters' });
      const validFreqs = ['weekly', 'bi-weekly', 'monthly'];
      if (!validFreqs.includes(payoutFrequency)) return res.status(400).json({ error: 'Invalid payout frequency' });
      try {
        await query('UPDATE suppliers SET payout_frequency = $1, updated_at = NOW() WHERE id = $2', [payoutFrequency, supplierId]);
        return res.status(200).json({ success: true });
      } catch (error) {
        console.error('Update payout error:', error);
        return res.status(500).json({ error: 'Failed to update payout frequency' });
      }
    }

    return res.status(400).json({ error: 'Unknown action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
