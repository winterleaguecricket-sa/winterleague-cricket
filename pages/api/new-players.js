// API to manage new players that need to be uploaded to CricClubs
// Stores data in the new_players database table
import { query } from '../../lib/db';

function formatRow(row) {
  return {
    id: String(row.id),
    playerName: row.player_name,
    email: row.email || '',
    team: row.team || '',
    dob: row.dob || '',
    submissionId: row.submission_id || '',
    registrationDate: row.registration_date ? new Date(row.registration_date).toISOString() : '',
    uploadedToCricClubs: row.uploaded_to_cricclubs || false,
    uploadedDate: row.uploaded_date ? new Date(row.uploaded_date).toISOString() : null
  };
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const result = await query(
        `SELECT id, player_name, email, team, dob, submission_id,
                registration_date, uploaded_to_cricclubs, uploaded_date
         FROM new_players
         ORDER BY created_at DESC`
      );

      const players = result.rows.map(formatRow);
      return res.status(200).json({ players });
    }

    if (req.method === 'POST') {
      // Add a new player to the list (called from form submission)
      const { playerName, email, team, dob, submissionId } = req.body;

      if (!playerName) {
        return res.status(400).json({ error: 'Player name is required' });
      }

      // Check if player already exists by submission ID
      if (submissionId) {
        const existing = await query(
          `SELECT id FROM new_players WHERE submission_id = $1 LIMIT 1`,
          [String(submissionId)]
        );
        if (existing.rows.length > 0) {
          return res.status(200).json({ message: 'Player already recorded' });
        }
      }

      const result = await query(
        `INSERT INTO new_players (player_name, email, team, dob, submission_id, registration_date)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING *`,
        [playerName, email || '', team || '', dob || '', submissionId || '']
      );

      const newPlayer = formatRow(result.rows[0]);
      return res.status(201).json({ message: 'Player added', player: newPlayer });
    }

    if (req.method === 'PUT') {
      // Update player status (mark as uploaded)
      const { playerIds, status } = req.body;

      if (!playerIds || !Array.isArray(playerIds)) {
        return res.status(400).json({ error: 'Player IDs array required' });
      }

      const numericIds = playerIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
      if (numericIds.length === 0) {
        return res.status(400).json({ error: 'No valid player IDs provided' });
      }

      const uploaded = status === 'uploaded';
      await query(
        `UPDATE new_players
         SET uploaded_to_cricclubs = $1,
             uploaded_date = $2,
             updated_at = NOW()
         WHERE id = ANY($3::int[])`,
        [uploaded, uploaded ? new Date().toISOString() : null, numericIds]
      );

      return res.status(200).json({ message: 'Players updated' });
    }

    if (req.method === 'DELETE') {
      // Remove a player from the list
      const { playerId } = req.body;

      if (!playerId) {
        return res.status(400).json({ error: 'Player ID required' });
      }

      await query(`DELETE FROM new_players WHERE id = $1`, [parseInt(playerId, 10)]);
      return res.status(200).json({ message: 'Player removed' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('new-players API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
