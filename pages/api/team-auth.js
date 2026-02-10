// Team authentication API
import { query } from '../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action } = req.body;

  try {
    switch (action) {
      case 'login': {
        const { email, password } = req.body;
        
        if (!email || !password) {
          return res.status(400).json({ error: 'Email and password are required' });
        }

        const result = await query(
          `SELECT * FROM teams WHERE LOWER(email) = LOWER($1)`,
          [email]
        );

        if (result.rows.length === 0) {
          return res.status(401).json({ error: 'Invalid email or password' });
        }

        const team = result.rows[0];

        if (team.password !== password) {
          return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Update last login
        await query(
          `UPDATE teams SET last_login = NOW() WHERE id = $1`,
          [team.id]
        );

        return res.status(200).json({
          success: true,
          team: {
            id: team.id,
            teamName: team.team_name,
            email: team.email,
            status: team.status
          }
        });
      }

      case 'changePassword': {
        const { teamId, currentPassword, newPassword } = req.body;
        
        if (!teamId || !currentPassword || !newPassword) {
          return res.status(400).json({ error: 'Team ID, current password, and new password are required' });
        }

        const result = await query(
          `SELECT password FROM teams WHERE id = $1`,
          [teamId]
        );

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Team not found' });
        }

        if (result.rows[0].password !== currentPassword) {
          return res.status(401).json({ error: 'Current password is incorrect' });
        }

        await query(
          `UPDATE teams SET password = $1 WHERE id = $2`,
          [newPassword, teamId]
        );

        return res.status(200).json({ success: true });
      }

      case 'changeEmail': {
        const { teamId, newEmail, password } = req.body;
        
        if (!teamId || !newEmail || !password) {
          return res.status(400).json({ error: 'Team ID, new email, and password are required' });
        }

        const result = await query(
          `SELECT password FROM teams WHERE id = $1`,
          [teamId]
        );

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Team not found' });
        }

        if (result.rows[0].password !== password) {
          return res.status(401).json({ error: 'Password is incorrect' });
        }

        // Check if email already exists
        const existingEmail = await query(
          `SELECT id FROM teams WHERE LOWER(email) = LOWER($1) AND id != $2`,
          [newEmail, teamId]
        );

        if (existingEmail.rows.length > 0) {
          return res.status(409).json({ error: 'Email already in use' });
        }

        await query(
          `UPDATE teams SET email = $1 WHERE id = $2`,
          [newEmail, teamId]
        );

        return res.status(200).json({ success: true });
      }

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Team auth error:', error);
    return res.status(500).json({ 
      error: 'Authentication failed',
      details: error.message 
    });
  }
}
