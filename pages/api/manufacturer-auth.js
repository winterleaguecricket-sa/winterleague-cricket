// Manufacturer Authentication API
// Handles login, session restore, and password management for kit manufacturers

import { query } from '../../lib/db';

export default async function handler(req, res) {
  // GET: Restore session by manufacturer ID
  if (req.method === 'GET') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Manufacturer ID required' });

    try {
      const result = await query(
        `SELECT id, company_name, email, contact_name, phone, created_at 
         FROM manufacturers WHERE id = $1 AND active = true`,
        [id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Manufacturer not found' });
      }
      const row = result.rows[0];
      return res.status(200).json({
        manufacturer: {
          id: row.id,
          companyName: row.company_name,
          email: row.email,
          contactName: row.contact_name,
          phone: row.phone,
          createdAt: row.created_at
        }
      });
    } catch (err) {
      console.error('Manufacturer session restore error:', err);
      return res.status(500).json({ error: 'Internal error' });
    }
  }

  // POST: Login or change password
  if (req.method === 'POST') {
    const { action, email, password, manufacturerId, newPassword } = req.body;

    if (action === 'login') {
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      try {
        const result = await query(
          `SELECT id, company_name, email, password, contact_name, phone, created_at 
           FROM manufacturers WHERE LOWER(email) = LOWER($1) AND active = true`,
          [email.trim()]
        );

        if (result.rows.length === 0) {
          return res.status(401).json({ error: 'Invalid email or password' });
        }

        const row = result.rows[0];
        // Plain text password comparison (matching team-portal pattern)
        if (row.password !== password) {
          return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Update last_login
        await query(`UPDATE manufacturers SET last_login = NOW() WHERE id = $1`, [row.id]);

        return res.status(200).json({
          manufacturer: {
            id: row.id,
            companyName: row.company_name,
            email: row.email,
            contactName: row.contact_name,
            phone: row.phone,
            createdAt: row.created_at
          }
        });
      } catch (err) {
        console.error('Manufacturer login error:', err);
        return res.status(500).json({ error: 'Internal error' });
      }
    }

    if (action === 'changePassword') {
      if (!manufacturerId || !newPassword) {
        return res.status(400).json({ error: 'Manufacturer ID and new password required' });
      }
      try {
        await query(
          `UPDATE manufacturers SET password = $1 WHERE id = $2`,
          [newPassword, manufacturerId]
        );
        return res.status(200).json({ success: true });
      } catch (err) {
        console.error('Manufacturer password change error:', err);
        return res.status(500).json({ error: 'Internal error' });
      }
    }

    return res.status(400).json({ error: 'Invalid action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
