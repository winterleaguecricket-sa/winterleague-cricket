// API endpoint for shirt designs CRUD operations
// Primary: PostgreSQL database | Fallback: data/shirtDesigns.json
import fs from 'fs';
import path from 'path';
import db from '../../lib/db';

const DATA_FILE = path.join(process.cwd(), 'data', 'shirtDesigns.json');

// ── Fallback: read from JSON file if DB is unavailable ──
function loadFromFile() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const fileData = fs.readFileSync(DATA_FILE, 'utf8');
      const data = JSON.parse(fileData);
      return (data.designs || []).map(d => ({
        ...d,
        images: d.images || (d.imageUrl ? [d.imageUrl] : [])
      }));
    }
  } catch (error) {
    console.error('[shirt-designs] JSON fallback read error:', error.message);
  }
  return [];
}

// ── Sync DB state back to JSON file (best-effort backup) ──
async function syncToFile() {
  try {
    const result = await db.query('SELECT * FROM shirt_designs ORDER BY id');
    const designs = result.rows.map(r => ({
      id: r.id,
      name: r.name,
      images: r.images || [],
      active: r.active,
      createdAt: r.created_at ? r.created_at.toISOString() : new Date().toISOString()
    }));
    const maxId = designs.length > 0 ? Math.max(...designs.map(d => d.id)) : 0;
    const fileData = { designs, idCounter: maxId + 1 };
    fs.writeFileSync(DATA_FILE, JSON.stringify(fileData, null, 2), 'utf8');
    console.log('[shirt-designs] Synced', designs.length, 'designs to JSON backup');
  } catch (err) {
    console.error('[shirt-designs] JSON sync error (non-fatal):', err.message);
  }
}

export default async function handler(req, res) {
  const { method } = req;

  switch (method) {
    case 'GET': {
      const { activeOnly } = req.query;
      try {
        let result;
        if (activeOnly === 'true') {
          result = await db.query('SELECT * FROM shirt_designs WHERE active = true ORDER BY id');
        } else {
          result = await db.query('SELECT * FROM shirt_designs ORDER BY id');
        }
        const designs = result.rows.map(r => ({
          id: r.id,
          name: r.name,
          images: r.images || [],
          active: r.active,
          createdAt: r.created_at ? r.created_at.toISOString() : null
        }));
        return res.status(200).json({ success: true, designs });
      } catch (dbErr) {
        console.error('[shirt-designs] DB read failed, falling back to JSON:', dbErr.message);
        let designs = loadFromFile();
        if (activeOnly === 'true') {
          designs = designs.filter(d => d.active);
        }
        return res.status(200).json({ success: true, designs, source: 'file-fallback' });
      }
    }

    case 'POST': {
      const { name, images, active } = req.body;
      if (!name) {
        return res.status(400).json({ success: false, error: 'Name is required' });
      }
      try {
        const result = await db.query(
          `INSERT INTO shirt_designs (name, images, active, created_at)
           VALUES ($1, $2, $3, NOW()) RETURNING *`,
          [name, JSON.stringify(images || []), active !== undefined ? active : true]
        );
        const row = result.rows[0];
        const design = {
          id: row.id,
          name: row.name,
          images: row.images || [],
          active: row.active,
          createdAt: row.created_at.toISOString()
        };
        await syncToFile();
        return res.status(201).json({ success: true, design });
      } catch (err) {
        console.error('[shirt-designs] POST error:', err.message);
        return res.status(500).json({ success: false, error: 'Failed to save design' });
      }
    }

    case 'PUT': {
      const { id, ...updates } = req.body;
      if (!id) {
        return res.status(400).json({ success: false, error: 'ID is required' });
      }
      try {
        // Build dynamic SET clause from provided fields
        const setClauses = [];
        const values = [];
        let paramIndex = 1;

        if (updates.name !== undefined) {
          setClauses.push(`name = $${paramIndex++}`);
          values.push(updates.name);
        }
        if (updates.images !== undefined) {
          setClauses.push(`images = $${paramIndex++}`);
          values.push(JSON.stringify(updates.images));
        }
        if (updates.active !== undefined) {
          setClauses.push(`active = $${paramIndex++}`);
          values.push(updates.active);
        }

        if (setClauses.length === 0) {
          return res.status(400).json({ success: false, error: 'No fields to update' });
        }

        values.push(parseInt(id));
        const result = await db.query(
          `UPDATE shirt_designs SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
          values
        );

        if (result.rows.length === 0) {
          return res.status(404).json({ success: false, error: 'Design not found' });
        }

        const row = result.rows[0];
        const design = {
          id: row.id,
          name: row.name,
          images: row.images || [],
          active: row.active,
          createdAt: row.created_at ? row.created_at.toISOString() : null
        };
        await syncToFile();
        return res.status(200).json({ success: true, design });
      } catch (err) {
        console.error('[shirt-designs] PUT error:', err.message);
        return res.status(500).json({ success: false, error: 'Failed to update design' });
      }
    }

    case 'DELETE': {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ success: false, error: 'ID is required' });
      }
      try {
        const result = await db.query(
          'DELETE FROM shirt_designs WHERE id = $1 RETURNING id',
          [parseInt(id)]
        );
        if (result.rows.length === 0) {
          return res.status(404).json({ success: false, error: 'Design not found' });
        }
        await syncToFile();
        return res.status(200).json({ success: true });
      } catch (err) {
        console.error('[shirt-designs] DELETE error:', err.message);
        return res.status(500).json({ success: false, error: 'Failed to delete design' });
      }
    }

    case 'PATCH': {
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({ success: false, error: 'ID is required' });
      }
      try {
        const result = await db.query(
          `UPDATE shirt_designs SET active = NOT active WHERE id = $1 RETURNING *`,
          [parseInt(id)]
        );
        if (result.rows.length === 0) {
          return res.status(404).json({ success: false, error: 'Design not found' });
        }
        const row = result.rows[0];
        const design = {
          id: row.id,
          name: row.name,
          images: row.images || [],
          active: row.active,
          createdAt: row.created_at ? row.created_at.toISOString() : null
        };
        await syncToFile();
        return res.status(200).json({ success: true, design });
      } catch (err) {
        console.error('[shirt-designs] PATCH error:', err.message);
        return res.status(500).json({ success: false, error: 'Failed to toggle status' });
      }
    }

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']);
      return res.status(405).json({ success: false, error: `Method ${method} Not Allowed` });
  }
}
