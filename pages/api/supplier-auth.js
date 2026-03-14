import { query } from '../../lib/db';
import { comparePassword, hashPassword } from '../../lib/auth';

export default async function handler(req, res) {
  // GET - restore session by supplier ID
  if (req.method === 'GET') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Supplier ID required' });
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) return res.status(400).json({ error: 'Invalid supplier ID' });

    try {
      const result = await query(
        `SELECT id, company_name, trading_name, email, phone, contact_person_name,
                status, sla_tier, active, categories, description,
                created_at, approved_at
         FROM suppliers WHERE id = $1 AND active = true`,
        [id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Supplier not found' });
      }
      return res.status(200).json({ supplier: formatSupplier(result.rows[0]) });
    } catch (error) {
      console.error('Supplier session restore error:', error);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  // POST - login or change password
  if (req.method === 'POST') {
    const { action, email, password, supplierId, currentPassword, newPassword } = req.body;

    // Login
    if (action === 'login') {
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
      try {
        const result = await query(
          `SELECT id, company_name, trading_name, email, phone, contact_person_name,
                  password, status, sla_tier, active, categories, description,
                  created_at, approved_at
           FROM suppliers WHERE LOWER(email) = LOWER($1)`,
          [email]
        );
        if (result.rows.length === 0) {
          return res.status(401).json({ error: 'Invalid email or password' });
        }
        const supplier = result.rows[0];

        if (!supplier.active) {
          return res.status(403).json({ error: 'Your supplier account has been deactivated. Please contact admin.' });
        }
        if (supplier.status !== 'approved') {
          return res.status(403).json({ error: 'Your supplier account is not yet approved.' });
        }

        const valid = await comparePassword(password, supplier.password);
        if (!valid) {
          return res.status(401).json({ error: 'Invalid email or password' });
        }

        return res.status(200).json({ supplier: formatSupplier(supplier) });
      } catch (error) {
        console.error('Supplier login error:', error);
        return res.status(500).json({ error: 'Server error' });
      }
    }

    // Change password
    if (action === 'changePassword') {
      if (!supplierId || !currentPassword || !newPassword) {
        return res.status(400).json({ error: 'All fields are required' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters' });
      }
      try {
        const result = await query('SELECT id, password FROM suppliers WHERE id = $1', [supplierId]);
        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Supplier not found' });
        }
        const valid = await comparePassword(currentPassword, result.rows[0].password);
        if (!valid) {
          return res.status(401).json({ error: 'Current password is incorrect' });
        }
        const hashed = await hashPassword(newPassword);
        await query('UPDATE suppliers SET password = $1 WHERE id = $2', [hashed, supplierId]);
        return res.status(200).json({ success: true, message: 'Password updated successfully' });
      } catch (error) {
        console.error('Supplier password change error:', error);
        return res.status(500).json({ error: 'Server error' });
      }
    }

    return res.status(400).json({ error: 'Invalid action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

function formatSupplier(row) {
  let cats = row.categories || [];
  if (typeof cats === 'string') {
    try { cats = JSON.parse(cats); } catch { cats = []; }
  }
  return {
    id: row.id,
    companyName: row.company_name,
    tradingName: row.trading_name,
    email: row.email,
    phone: row.phone,
    contactPersonName: row.contact_person_name,
    status: row.status,
    slaTier: row.sla_tier,
    active: row.active,
    categories: cats,
    description: row.description,
    createdAt: row.created_at,
    approvedAt: row.approved_at
  };
}
