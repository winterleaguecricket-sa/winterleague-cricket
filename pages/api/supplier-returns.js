// Supplier Returns & Disputes API
import { query } from '../../lib/db';

// Ensure tables exist on first call
async function ensureTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS supplier_returns (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      supplier_order_id UUID NOT NULL REFERENCES supplier_orders(id),
      supplier_id UUID NOT NULL REFERENCES suppliers(id),
      order_number VARCHAR(50),
      customer_name VARCHAR(255),
      customer_email VARCHAR(255),
      items JSONB,
      reason VARCHAR(50) NOT NULL,
      reason_detail TEXT,
      return_status VARCHAR(30) DEFAULT 'requested',
      refund_amount DECIMAL(10, 2) DEFAULT 0,
      supplier_response TEXT,
      supplier_responded_at TIMESTAMP,
      admin_notes TEXT,
      admin_resolved_at TIMESTAMP,
      resolution VARCHAR(30),
      dispute_status VARCHAR(30),
      dispute_reason TEXT,
      dispute_opened_at TIMESTAMP,
      dispute_resolved_at TIMESTAMP,
      sla_deadline TIMESTAMP,
      sla_breached BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_supplier_returns_supplier ON supplier_returns(supplier_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_supplier_returns_status ON supplier_returns(return_status)`);
}

export default async function handler(req, res) {
  try {
    await ensureTables();

    // ─── GET: List returns ─────────────────────────────────
    if (req.method === 'GET') {
      const { supplierId, view, returnId } = req.query;

      // Admin: all returns
      if (view === 'admin-list') {
        const result = await query(`
          SELECT r.*, s.company_name AS supplier_name
          FROM supplier_returns r
          JOIN suppliers s ON r.supplier_id = s.id
          ORDER BY 
            CASE WHEN r.dispute_status = 'open' THEN 0 
                 WHEN r.return_status = 'requested' THEN 1
                 WHEN r.return_status = 'approved' THEN 2
                 ELSE 3 END,
            r.created_at DESC
        `);
        const stats = {
          total: result.rows.length,
          requested: result.rows.filter(r => r.return_status === 'requested').length,
          approved: result.rows.filter(r => r.return_status === 'approved').length,
          rejected: result.rows.filter(r => r.return_status === 'rejected').length,
          refunded: result.rows.filter(r => r.return_status === 'refunded').length,
          openDisputes: result.rows.filter(r => r.dispute_status === 'open').length,
        };
        return res.json({ success: true, returns: result.rows.map(formatReturn), stats });
      }

      // Single return detail
      if (returnId) {
        const result = await query(`
          SELECT r.*, s.company_name AS supplier_name
          FROM supplier_returns r
          JOIN suppliers s ON r.supplier_id = s.id
          WHERE r.id = $1`, [returnId]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Return not found' });
        return res.json({ success: true, returnItem: formatReturn(result.rows[0]) });
      }

      // Supplier: their returns
      if (!supplierId) return res.status(400).json({ success: false, error: 'supplierId required' });
      if (supplierId === 'admin') return res.json({ success: true, returns: [], stats: { total: 0, requested: 0, approved: 0, rejected: 0, refunded: 0 } });

      const result = await query(`
        SELECT * FROM supplier_returns WHERE supplier_id = $1 ORDER BY created_at DESC
      `, [supplierId]);

      const stats = {
        total: result.rows.length,
        requested: result.rows.filter(r => r.return_status === 'requested').length,
        approved: result.rows.filter(r => r.return_status === 'approved').length,
        rejected: result.rows.filter(r => r.return_status === 'rejected').length,
        refunded: result.rows.filter(r => r.return_status === 'refunded').length,
      };

      return res.json({ success: true, returns: result.rows.map(formatReturn), stats });
    }

    // ─── POST: Actions ─────────────────────────────────────
    if (req.method === 'POST') {
      const { action } = req.body;

      // Customer/admin creates a return request
      if (action === 'request-return') {
        const { supplierOrderId, reason, reasonDetail, items } = req.body;
        if (!supplierOrderId || !reason) return res.status(400).json({ success: false, error: 'Order ID and reason required' });

        const validReasons = ['defective', 'wrong_item', 'not_as_described', 'damaged_in_transit', 'size_issue', 'other'];
        if (!validReasons.includes(reason)) return res.status(400).json({ success: false, error: 'Invalid reason' });

        // Get supplier order
        const orderResult = await query('SELECT * FROM supplier_orders WHERE id = $1', [supplierOrderId]);
        if (orderResult.rows.length === 0) return res.status(404).json({ success: false, error: 'Order not found' });
        const order = orderResult.rows[0];

        if (!['shipped', 'delivered'].includes(order.fulfillment_status)) {
          return res.status(400).json({ success: false, error: 'Returns only allowed for shipped or delivered orders' });
        }

        // Check for duplicate
        const existing = await query(
          `SELECT id FROM supplier_returns WHERE supplier_order_id = $1 AND return_status NOT IN ('rejected', 'closed') LIMIT 1`,
          [supplierOrderId]
        );
        if (existing.rows.length > 0) {
          return res.status(400).json({ success: false, error: 'A return request already exists for this order' });
        }

        // Calculate SLA deadline from supplier's tier config
        const slaConfig = await query(
          `SELECT return_processing_days FROM supplier_sla_config WHERE tier = (SELECT COALESCE(sla_tier, 'standard') FROM suppliers WHERE id = $1)`,
          [order.supplier_id]
        );
        const returnDays = slaConfig.rows[0]?.return_processing_days || 7;
        const slaDeadline = new Date(Date.now() + returnDays * 24 * 60 * 60 * 1000);

        const result = await query(`
          INSERT INTO supplier_returns 
            (supplier_order_id, supplier_id, order_number, customer_name, customer_email,
             items, reason, reason_detail, refund_amount, sla_deadline)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id
        `, [
          supplierOrderId, order.supplier_id, order.order_number,
          order.customer_name, order.customer_email,
          items ? JSON.stringify(items) : JSON.stringify(typeof order.items === 'string' ? JSON.parse(order.items) : order.items),
          reason, reasonDetail || null,
          parseFloat(order.supplier_amount || 0),
          slaDeadline.toISOString()
        ]);

        return res.json({ success: true, returnId: result.rows[0].id, message: 'Return request submitted' });
      }

      // Supplier approves a return
      if (action === 'approve-return') {
        const { returnId, supplierId, supplierResponse } = req.body;
        if (!returnId || !supplierId) return res.status(400).json({ success: false, error: 'Return ID and supplier ID required' });

        const ret = await query('SELECT * FROM supplier_returns WHERE id = $1 AND supplier_id = $2', [returnId, supplierId]);
        if (ret.rows.length === 0) return res.status(404).json({ success: false, error: 'Return not found' });
        if (ret.rows[0].return_status !== 'requested') return res.status(400).json({ success: false, error: 'Return already processed' });

        await query(`
          UPDATE supplier_returns SET return_status = 'approved', supplier_response = $1,
                 supplier_responded_at = NOW(), updated_at = NOW()
          WHERE id = $2`, [supplierResponse || 'Approved', returnId]);

        return res.json({ success: true, message: 'Return approved' });
      }

      // Supplier rejects a return
      if (action === 'reject-return') {
        const { returnId, supplierId, supplierResponse } = req.body;
        if (!returnId || !supplierId) return res.status(400).json({ success: false, error: 'Return ID and supplier ID required' });
        if (!supplierResponse?.trim()) return res.status(400).json({ success: false, error: 'Rejection reason required' });

        const ret = await query('SELECT * FROM supplier_returns WHERE id = $1 AND supplier_id = $2', [returnId, supplierId]);
        if (ret.rows.length === 0) return res.status(404).json({ success: false, error: 'Return not found' });
        if (ret.rows[0].return_status !== 'requested') return res.status(400).json({ success: false, error: 'Return already processed' });

        await query(`
          UPDATE supplier_returns SET return_status = 'rejected', supplier_response = $1,
                 supplier_responded_at = NOW(), updated_at = NOW()
          WHERE id = $2`, [supplierResponse, returnId]);

        return res.json({ success: true, message: 'Return rejected' });
      }

      // Customer escalates to dispute
      if (action === 'open-dispute') {
        const { returnId, disputeReason } = req.body;
        if (!returnId) return res.status(400).json({ success: false, error: 'Return ID required' });

        const ret = await query('SELECT * FROM supplier_returns WHERE id = $1', [returnId]);
        if (ret.rows.length === 0) return res.status(404).json({ success: false, error: 'Return not found' });
        if (!['rejected', 'requested'].includes(ret.rows[0].return_status)) {
          return res.status(400).json({ success: false, error: 'Can only dispute rejected or unprocessed returns' });
        }

        await query(`
          UPDATE supplier_returns SET dispute_status = 'open', dispute_reason = $1,
                 dispute_opened_at = NOW(), updated_at = NOW()
          WHERE id = $2`, [disputeReason || 'Customer disagrees with decision', returnId]);

        return res.json({ success: true, message: 'Dispute opened — admin will review' });
      }

      // Admin resolves dispute / manages return
      if (action === 'admin-resolve') {
        const { returnId, resolution, adminNotes, refundAmount } = req.body;
        if (!returnId || !resolution) return res.status(400).json({ success: false, error: 'Return ID and resolution required' });

        const validResolutions = ['refund_full', 'refund_partial', 'reject', 'replace'];
        if (!validResolutions.includes(resolution)) return res.status(400).json({ success: false, error: 'Invalid resolution' });

        const ret = await query('SELECT * FROM supplier_returns WHERE id = $1', [returnId]);
        if (ret.rows.length === 0) return res.status(404).json({ success: false, error: 'Return not found' });

        let newStatus = 'refunded';
        let finalRefund = parseFloat(ret.rows[0].refund_amount || 0);

        if (resolution === 'refund_full') {
          newStatus = 'refunded';
        } else if (resolution === 'refund_partial') {
          newStatus = 'refunded';
          finalRefund = parseFloat(refundAmount || 0);
        } else if (resolution === 'reject') {
          newStatus = 'closed';
          finalRefund = 0;
        } else if (resolution === 'replace') {
          newStatus = 'replaced';
        }

        await query(`
          UPDATE supplier_returns SET 
            return_status = $1, resolution = $2, refund_amount = $3,
            admin_notes = $4, admin_resolved_at = NOW(),
            dispute_status = CASE WHEN dispute_status = 'open' THEN 'resolved' ELSE dispute_status END,
            dispute_resolved_at = CASE WHEN dispute_status = 'open' THEN NOW() ELSE dispute_resolved_at END,
            updated_at = NOW()
          WHERE id = $5
        `, [newStatus, resolution, finalRefund, adminNotes || null, returnId]);

        return res.json({ success: true, message: `Return resolved: ${resolution.replace('_', ' ')}` });
      }

      return res.status(400).json({ success: false, error: 'Invalid action' });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    console.error('Supplier returns API error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}

function formatReturn(row) {
  return {
    id: row.id,
    supplierOrderId: row.supplier_order_id,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name || '',
    orderNumber: row.order_number || '',
    customerName: row.customer_name || '',
    customerEmail: row.customer_email || '',
    items: typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || []),
    reason: row.reason,
    reasonDetail: row.reason_detail || '',
    returnStatus: row.return_status,
    refundAmount: parseFloat(row.refund_amount || 0),
    supplierResponse: row.supplier_response || '',
    supplierRespondedAt: row.supplier_responded_at,
    adminNotes: row.admin_notes || '',
    adminResolvedAt: row.admin_resolved_at,
    resolution: row.resolution || '',
    disputeStatus: row.dispute_status || '',
    disputeReason: row.dispute_reason || '',
    disputeOpenedAt: row.dispute_opened_at,
    disputeResolvedAt: row.dispute_resolved_at,
    slaDeadline: row.sla_deadline,
    slaBreached: row.sla_breached || false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
