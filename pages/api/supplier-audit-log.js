// Supplier Audit Log API — Phase 10
import { query } from '../../lib/db';

async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS supplier_audit_log (
      id SERIAL PRIMARY KEY,
      admin_action VARCHAR(80) NOT NULL,
      entity_type VARCHAR(40) NOT NULL,
      entity_id VARCHAR(100),
      entity_label VARCHAR(255),
      details JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_audit_log_created ON supplier_audit_log(created_at DESC)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON supplier_audit_log(entity_type, entity_id)`);
}

export default async function handler(req, res) {
  try {
    await ensureTable();

    if (req.method === 'GET') {
      const { entityType, entityId, limit: limitParam } = req.query;
      const limit = Math.min(parseInt(limitParam) || 100, 500);

      let sql = `SELECT * FROM supplier_audit_log`;
      const params = [];
      const conditions = [];

      if (entityType) { conditions.push(`entity_type = $${params.length + 1}`); params.push(entityType); }
      if (entityId) { conditions.push(`entity_id = $${params.length + 1}`); params.push(entityId); }

      if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
      sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const result = await query(sql, params);
      return res.json({ success: true, logs: result.rows.map(formatLog), total: result.rows.length });
    }

    if (req.method === 'POST') {
      const { action: adminAction, entityType, entityId, entityLabel, details } = req.body;
      if (!adminAction || !entityType) return res.status(400).json({ error: 'action and entityType required' });

      await query(
        `INSERT INTO supplier_audit_log (admin_action, entity_type, entity_id, entity_label, details) VALUES ($1, $2, $3, $4, $5)`,
        [adminAction, entityType, entityId || null, entityLabel || null, details ? JSON.stringify(details) : null]
      );
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Audit log error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

function formatLog(row) {
  return {
    id: row.id,
    action: row.admin_action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    entityLabel: row.entity_label || '',
    details: typeof row.details === 'string' ? JSON.parse(row.details) : (row.details || {}),
    createdAt: row.created_at,
  };
}
