import { query } from '../../lib/db';

const ensureTable = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS player_removal_requests (
      id SERIAL PRIMARY KEY,
      team_id INTEGER REFERENCES teams(id),
      player_id INTEGER REFERENCES team_players(id),
      status VARCHAR(20) DEFAULT 'pending',
      manager_message TEXT,
      admin_message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_player_removal_team_id ON player_removal_requests(team_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_player_removal_status ON player_removal_requests(status)`);
};

const formatRequest = (row) => ({
  id: row.id,
  teamId: row.team_id,
  playerId: row.player_id,
  status: row.status,
  managerMessage: row.manager_message,
  adminMessage: row.admin_message,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  teamName: row.team_name,
  playerName: row.player_name,
  subTeam: row.sub_team,
  jerseyNumber: row.jersey_number
});

export default async function handler(req, res) {
  try {
    await ensureTable();

    if (req.method === 'GET') {
      const { teamId, all } = req.query;

      if (teamId) {
        const result = await query(
          `SELECT r.*, p.player_name, p.sub_team, p.jersey_number
           FROM player_removal_requests r
           LEFT JOIN team_players p ON r.player_id = p.id
           WHERE r.team_id = $1
           ORDER BY r.created_at DESC`,
          [teamId]
        );
        return res.status(200).json({ requests: result.rows.map(formatRequest) });
      }

      if (all === 'true') {
        const result = await query(
          `SELECT r.*, t.team_name, p.player_name, p.sub_team, p.jersey_number
           FROM player_removal_requests r
           LEFT JOIN teams t ON r.team_id = t.id
           LEFT JOIN team_players p ON r.player_id = p.id
           ORDER BY r.created_at DESC`
        );
        return res.status(200).json({ requests: result.rows.map(formatRequest) });
      }

      return res.status(400).json({ error: 'teamId or all=true is required' });
    }

    if (req.method === 'POST') {
      const { teamId, playerId, message } = req.body || {};
      if (!teamId || !playerId) {
        return res.status(400).json({ error: 'teamId and playerId are required' });
      }

      const existing = await query(
        `SELECT id FROM player_removal_requests WHERE player_id = $1 AND status = 'pending'`,
        [playerId]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Removal request already pending for this player' });
      }

      const result = await query(
        `INSERT INTO player_removal_requests (team_id, player_id, status, manager_message)
         VALUES ($1, $2, 'pending', $3)
         RETURNING *`,
        [teamId, playerId, message || '']
      );

      return res.status(201).json({ request: formatRequest(result.rows[0]) });
    }

    if (req.method === 'PUT') {
      const { id, status, adminMessage } = req.body || {};
      if (!id || !status) {
        return res.status(400).json({ error: 'id and status are required' });
      }
      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'status must be approved or rejected' });
      }

      const result = await query(
        `UPDATE player_removal_requests
         SET status = $1, admin_message = $2, updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [status, adminMessage || '', id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Request not found' });
      }

      const request = result.rows[0];

      if (status === 'approved' && request.player_id) {
        await query(
          `UPDATE team_players SET team_id = NULL, sub_team = NULL WHERE id = $1`,
          [request.player_id]
        );
      }

      if (request.team_id) {
        const subject = status === 'approved' ? 'Player removal approved' : 'Player removal rejected';
        const message = status === 'approved'
          ? `Your request to remove a player has been approved. ${adminMessage || ''}`
          : `Your request to remove a player was rejected. ${adminMessage || ''}`;
        await query(
          `INSERT INTO team_messages (team_id, subject, message, is_read)
           VALUES ($1, $2, $3, false)`,
          [request.team_id, subject, message]
        );
      }

      return res.status(200).json({ request: formatRequest(result.rows[0]) });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Player removal request error:', error);
    return res.status(500).json({ error: 'Failed to handle player removal request', details: error.message });
  }
}
