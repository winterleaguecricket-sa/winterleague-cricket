// API: Manufacturer Status Update
// Allows manufacturers (and admin) to update manufacturing_status on teams
// Supports bulk updates: { teamIds: [1,2,3], status: 'in_production' }
import pool from '../../lib/db';

const VALID_STATUSES = ['pending', 'in_production', 'ready_for_dispatch', 'dispatched'];

const STATUS_LABELS = {
  pending: 'Pending',
  in_production: 'In Production',
  ready_for_dispatch: 'Ready for Dispatch',
  dispatched: 'Dispatched'
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { teamIds, status } = req.body;

    if (!teamIds || !Array.isArray(teamIds) || teamIds.length === 0) {
      return res.status(400).json({ error: 'teamIds array is required' });
    }

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    // Update all specified teams
    const result = await pool.query(
      `UPDATE teams SET manufacturing_status = $1, updated_at = NOW()
       WHERE id = ANY($2::int[])
       RETURNING id, team_name, manufacturing_status`,
      [status, teamIds]
    );

    return res.status(200).json({
      success: true,
      updated: result.rows.length,
      teams: result.rows.map(r => ({
        id: r.id,
        teamName: r.team_name,
        status: r.manufacturing_status,
        statusLabel: STATUS_LABELS[r.manufacturing_status] || r.manufacturing_status
      }))
    });
  } catch (err) {
    console.error('Manufacturer status update error:', err);
    return res.status(500).json({ error: 'Failed to update status' });
  }
}
