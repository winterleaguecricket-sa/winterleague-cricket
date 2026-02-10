import { query } from '../../lib/db';

let cachedCategoryColumns;

const getCategoryColumns = async () => {
  if (cachedCategoryColumns) return cachedCategoryColumns;
  const result = await query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'categories'"
  );
  cachedCategoryColumns = new Set((result.rows || []).map(row => row.column_name));
  return cachedCategoryColumns;
};

const formatCategory = (row) => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  description: row.description,
  icon: row.icon,
  parentId: row.parent_id,
  displayOrder: row.display_order,
  active: row.active
});

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const result = await query('SELECT * FROM categories ORDER BY display_order ASC, created_at DESC');
      const rows = result.rows || [];
      const categories = rows.filter(r => !r.parent_id).map(formatCategory);
      const subcategories = rows.filter(r => r.parent_id).map(formatCategory);
      return res.status(200).json({ success: true, categories, subcategories });
    }

    if (req.method === 'POST') {
      const { name, slug, description, icon, parentId, displayOrder, active } = req.body || {};
      const columns = await getCategoryColumns();
      const hasSlug = columns.has('slug');
      const hasIcon = columns.has('icon');
      const hasDescription = columns.has('description');
      const hasParent = columns.has('parent_id');
      const hasDisplayOrder = columns.has('display_order');
      const hasActive = columns.has('active');

      if (!name || (hasSlug && !slug)) {
        return res.status(400).json({ success: false, error: 'Name and slug are required' });
      }

      const insertFields = ['name'];
      const insertValues = [name];
      const placeholders = ['$1'];

      const addField = (field, value) => {
        insertFields.push(field);
        insertValues.push(value);
        placeholders.push(`$${insertValues.length}`);
      };

      if (hasSlug) addField('slug', slug);
      if (hasDescription) addField('description', description || null);
      if (hasIcon) addField('icon', icon || null);
      if (hasParent) addField('parent_id', parentId || null);
      if (hasDisplayOrder) {
        addField('display_order', Number.isFinite(displayOrder) ? displayOrder : 0);
      }
      if (hasActive) addField('active', active === undefined ? true : !!active);

      const result = await query(
        `INSERT INTO categories (${insertFields.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
        insertValues
      );

      return res.status(200).json({ success: true, category: formatCategory(result.rows[0]) });
    }

    if (req.method === 'PUT') {
      const { id, name, slug, description, icon, parentId, displayOrder, active } = req.body || {};
      if (!id) {
        return res.status(400).json({ success: false, error: 'Category id is required' });
      }

      const columns = await getCategoryColumns();
      const hasSlug = columns.has('slug');
      const hasIcon = columns.has('icon');
      const hasDescription = columns.has('description');
      const hasParent = columns.has('parent_id');
      const hasDisplayOrder = columns.has('display_order');
      const hasActive = columns.has('active');

      const updates = [];
      const values = [];
      let paramCount = 1;

      const addUpdate = (field, value) => {
        updates.push(`${field} = $${paramCount}`);
        values.push(value);
        paramCount++;
      };

      if (name !== undefined) addUpdate('name', name);
      if (hasSlug && slug !== undefined) addUpdate('slug', slug);
      if (hasDescription && description !== undefined) addUpdate('description', description || null);
      if (hasIcon && icon !== undefined) addUpdate('icon', icon || null);
      if (hasParent && parentId !== undefined) addUpdate('parent_id', parentId || null);
      if (hasDisplayOrder && displayOrder !== undefined) addUpdate('display_order', Number(displayOrder) || 0);
      if (hasActive && active !== undefined) addUpdate('active', !!active);

      if (updates.length === 0) {
        return res.status(400).json({ success: false, error: 'No fields to update' });
      }

      values.push(id);
      const result = await query(
        `UPDATE categories SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Category not found' });
      }

      return res.status(200).json({ success: true, category: formatCategory(result.rows[0]) });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ success: false, error: 'Category id is required' });
      }

      await query('DELETE FROM categories WHERE parent_id = $1', [id]);
      const result = await query('DELETE FROM categories WHERE id = $1 RETURNING *', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Category not found' });
      }

      return res.status(200).json({ success: true, deleted: formatCategory(result.rows[0]) });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Categories API error:', error);
    return res.status(500).json({ success: false, error: 'Server error', details: error.message });
  }
}