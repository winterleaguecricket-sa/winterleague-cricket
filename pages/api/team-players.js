// Team players management API
import { query } from '../../lib/db';

export default async function handler(req, res) {
  // GET - Fetch players
  if (req.method === 'GET') {
    try {
      const { teamId, id, email, showAll } = req.query;
      
      if (id) {
        const result = await query(
          `SELECT * FROM team_players WHERE id = $1`,
          [id]
        );
        
        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Player not found' });
        }
        
        return res.status(200).json({ player: formatPlayer(result.rows[0]) });
      }

      // Fetch players by parent email (across all teams)
      if (email) {
        const result = await query(
          `SELECT tp.*, t.team_name, t.age_group_teams
           FROM team_players tp
           LEFT JOIN teams t ON t.id = tp.team_id
           WHERE LOWER(tp.player_email) = LOWER($1)
           ORDER BY tp.created_at`,
          [email.trim()]
        );
        return res.status(200).json({
          players: result.rows.map(row => ({
            ...formatPlayer(row),
            teamName: row.team_name || null,
            ageGroupTeams: typeof row.age_group_teams === 'string' ? JSON.parse(row.age_group_teams) : (row.age_group_teams || [])
          }))
        });
      }
      
      if (!teamId) {
        return res.status(400).json({ error: 'Team ID is required' });
      }

      const playerFilter = showAll === 'true' ? '' : "AND payment_status = 'paid'";
      const result = await query(
        `SELECT * FROM team_players WHERE team_id = $1 ${playerFilter} ORDER BY created_at`,
        [teamId]
      );
      
      return res.status(200).json({ 
        players: result.rows.map(formatPlayer) 
      });
      
    } catch (error) {
      console.error('Error fetching players:', error);
      return res.status(500).json({ error: 'Failed to fetch players', details: error.message });
    }
  }

  // POST - Add player
  if (req.method === 'POST') {
    try {
      const { teamId, subTeam, playerName, playerEmail, playerPhone, idNumber, jerseySize, jerseyNumber, position, registrationData } = req.body;

      if (!teamId || !playerName) {
        return res.status(400).json({ error: 'Team ID and player name are required' });
      }

      const result = await query(
        `INSERT INTO team_players (team_id, sub_team, player_name, player_email, player_phone, id_number, jersey_size, jersey_number, position, registration_data, payment_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'paid')
         RETURNING *`,
        [teamId, subTeam, playerName, playerEmail, playerPhone, idNumber, jerseySize, jerseyNumber, position, JSON.stringify(registrationData || {})]
      );

      return res.status(201).json({ 
        success: true, 
        player: formatPlayer(result.rows[0]) 
      });

    } catch (error) {
      console.error('Error adding player:', error);
      return res.status(500).json({ error: 'Failed to add player', details: error.message });
    }
  }

  // PUT - Update player
  if (req.method === 'PUT') {
    try {
      const { action, id, subTeam, playerName, playerEmail, playerPhone, idNumber, jerseySize, jerseyNumber, position, playerId, roles } = req.body;

      if (action === 'updateRoles') {
        const targetId = playerId || id;
        if (!targetId) {
          return res.status(400).json({ error: 'Player ID is required' });
        }

        const safeRoles = Array.isArray(roles)
          ? roles.map((role) => String(role).trim()).filter(Boolean)
          : [];

        const existing = await query(
          `SELECT registration_data FROM team_players WHERE id = $1`,
          [targetId]
        );

        if (existing.rows.length === 0) {
          return res.status(404).json({ error: 'Player not found' });
        }

        const registrationData = typeof existing.rows[0].registration_data === 'string'
          ? JSON.parse(existing.rows[0].registration_data)
          : (existing.rows[0].registration_data || {});

        const updatedRegistration = {
          ...registrationData,
          roles: safeRoles
        };

        const updateResult = await query(
          `UPDATE team_players SET registration_data = $1 WHERE id = $2 RETURNING *`,
          [JSON.stringify(updatedRegistration), targetId]
        );

        return res.status(200).json({
          success: true,
          player: formatPlayer(updateResult.rows[0])
        });
      }

      if (!id) {
        return res.status(400).json({ error: 'Player ID is required' });
      }

      const result = await query(
        `UPDATE team_players 
         SET sub_team = COALESCE($1, sub_team),
             player_name = COALESCE($2, player_name),
             player_email = COALESCE($3, player_email),
             player_phone = COALESCE($4, player_phone),
             id_number = COALESCE($5, id_number),
             jersey_size = COALESCE($6, jersey_size),
             jersey_number = COALESCE($7, jersey_number),
             position = COALESCE($8, position)
         WHERE id = $9
         RETURNING *`,
        [subTeam, playerName, playerEmail, playerPhone, idNumber, jerseySize, jerseyNumber, position, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Player not found' });
      }

      return res.status(200).json({ 
        success: true, 
        player: formatPlayer(result.rows[0]) 
      });

    } catch (error) {
      console.error('Error updating player:', error);
      return res.status(500).json({ error: 'Failed to update player', details: error.message });
    }
  }

  // DELETE - Remove player
  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Player ID is required' });
      }

      const result = await query(
        `DELETE FROM team_players WHERE id = $1 RETURNING id`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Player not found' });
      }

      return res.status(200).json({ success: true });

    } catch (error) {
      console.error('Error deleting player:', error);
      return res.status(500).json({ error: 'Failed to delete player', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

function formatPlayer(row) {
  return {
    id: row.id,
    teamId: row.team_id,
    subTeam: row.sub_team,
    playerName: row.player_name,
    playerEmail: row.player_email,
    playerPhone: row.player_phone,
    idNumber: row.id_number,
    jerseySize: row.jersey_size,
    jerseyNumber: row.jersey_number,
    position: row.position,
    registrationData: typeof row.registration_data === 'string' ? JSON.parse(row.registration_data) : row.registration_data,
    paymentStatus: row.payment_status || 'pending_payment',
    createdAt: row.created_at
  };
}
