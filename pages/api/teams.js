// Database-only teams API
// Replaces in-memory storage with PostgreSQL database

import { query } from '../../lib/db';

export default async function handler(req, res) {
  // GET - Fetch teams
  if (req.method === 'GET') {
    try {
      const { id, email, teamName, linkedOnly } = req.query;
      
      // Get single team by ID
      if (id) {
        const result = await query(
          `SELECT * FROM teams WHERE id = $1`,
          [id]
        );
        
        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Team not found' });
        }
        
        const team = await formatTeam(result.rows[0]);
        return res.status(200).json({ team });
      }
      
      // Get team by email
      if (email) {
        const result = await query(
          `SELECT * FROM teams WHERE LOWER(email) = LOWER($1)`,
          [email]
        );
        
        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Team not found' });
        }
        
        const team = await formatTeam(result.rows[0]);
        return res.status(200).json({ team });
      }
      
      // Get team by name
      if (teamName) {
        const result = await query(
          `SELECT * FROM teams WHERE LOWER(team_name) = LOWER($1)`,
          [teamName]
        );
        
        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Team not found' });
        }
        
        const team = await formatTeam(result.rows[0]);
        return res.status(200).json({ team });
      }
      
      // Get all teams
      let result;
      if (linkedOnly === 'true') {
        result = await query(
          `SELECT t.*
           FROM teams t
           JOIN form_submissions s
             ON s.form_id::text = '1'
            AND (t.form_submission_id::text = s.id::text
                 OR LOWER(t.email) = LOWER(s.customer_email))
           WHERE t.status IS DISTINCT FROM 'archived'
           ORDER BY t.created_at DESC`
        );
      } else {
        result = await query(
          `SELECT * FROM teams ORDER BY created_at DESC`
        );
      }
      
      const teams = await Promise.all(result.rows.map(formatTeam));
      return res.status(200).json({ teams });
      
    } catch (error) {
      console.error('Error fetching teams:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch teams',
        details: error.message 
      });
    }
  }

  // POST - Create new team
  if (req.method === 'POST') {
    try {
      const { submissionData, formSubmissionId } = req.body;

      if (!submissionData) {
        return res.status(400).json({ error: 'Submission data is required' });
      }

      // Extract fields from submission data
      const teamName = submissionData['1'] || submissionData[1] || submissionData.teamName || '';
      const managerName = submissionData['2'] || submissionData[2] || submissionData.managerName || '';
      const managerPhone = submissionData['35'] || submissionData[35] || submissionData.managerPhone || '';
      const email = submissionData['3'] || submissionData[3] || submissionData.email || '';
      const suburb = submissionData['5'] || submissionData[5] || submissionData.suburb || '';
      const teamLogo = submissionData['22'] || submissionData[22] || submissionData.teamLogo || '';
      const shirtDesign = submissionData['23'] || submissionData[23] || submissionData.shirtDesign || '';
      const primaryColor = submissionData['23_primaryColor'] || submissionData.primaryColor || '';
      const secondaryColor = submissionData['23_secondaryColor'] || submissionData.secondaryColor || '';
      const sponsorLogo = submissionData['30'] || submissionData[30] || submissionData.sponsorLogo || '';
      const numberOfTeams = parseInt(submissionData['32'] || submissionData[32] || submissionData.numberOfTeams || 1);
      const ageGroupTeams = submissionData['33'] || submissionData[33] || submissionData.ageGroupTeams || [];
      const kitPricing = {
        basePrice: submissionData['29_basePrice'] || 150,
        markup: submissionData['29_markup'] || 0
      };
      const entryFee = {
        baseFee: submissionData['31_baseFee'] || 500
      };

      // Generate temporary password
      const password = generateTemporaryPassword();

      // Check if team already exists
      const existingTeam = await query(
        `SELECT id FROM teams WHERE LOWER(email) = LOWER($1)`,
        [email]
      );

      if (existingTeam.rows.length > 0) {
        return res.status(409).json({ 
          error: 'Team with this email already exists',
          teamId: existingTeam.rows[0].id
        });
      }

      const result = await query(
        `INSERT INTO teams (
          form_submission_id, team_name, manager_name, manager_phone, email, suburb,
          team_logo, shirt_design, primary_color, secondary_color, sponsor_logo,
          number_of_teams, age_group_teams, kit_pricing, entry_fee, password, submission_data, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING *`,
        [
          formSubmissionId,
          teamName,
          managerName,
          managerPhone,
          email,
          suburb,
          teamLogo,
          shirtDesign,
          primaryColor,
          secondaryColor,
          sponsorLogo,
          numberOfTeams,
          JSON.stringify(ageGroupTeams),
          JSON.stringify(kitPricing),
          JSON.stringify(entryFee),
          password,
          JSON.stringify(submissionData),
          'pending'
        ]
      );

      const team = await formatTeam(result.rows[0]);
      team.password = password; // Include password in response for sending to user

      return res.status(201).json({ success: true, team });

    } catch (error) {
      console.error('Error creating team:', error);
      return res.status(500).json({ 
        error: 'Failed to create team',
        details: error.message 
      });
    }
  }

  // PUT - Update team
  if (req.method === 'PUT') {
    try {
      const { id, ...updates } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Team ID is required' });
      }

      const allowedFields = [
        'team_name', 'manager_name', 'manager_phone', 'email', 'suburb',
        'team_logo', 'shirt_design', 'primary_color', 'secondary_color', 'sponsor_logo',
        'number_of_teams', 'age_group_teams', 'kit_pricing', 'entry_fee', 
        'password', 'status', 'last_login', 'submission_data', 'banking_details'
      ];

      const updateClauses = [];
      const values = [];
      let paramCount = 1;

      for (const [key, value] of Object.entries(updates)) {
        const snakeKey = camelToSnake(key);
        if (allowedFields.includes(snakeKey)) {
          updateClauses.push(`${snakeKey} = $${paramCount}`);
          values.push(typeof value === 'object' ? JSON.stringify(value) : value);
          paramCount++;
        }
      }

      if (updateClauses.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      values.push(id);

      const result = await query(
        `UPDATE teams SET ${updateClauses.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Team not found' });
      }

      const team = await formatTeam(result.rows[0]);
      return res.status(200).json({ success: true, team });

    } catch (error) {
      console.error('Error updating team:', error);
      return res.status(500).json({ 
        error: 'Failed to update team',
        details: error.message 
      });
    }
  }

  // DELETE - Delete team
  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Team ID is required' });
      }

      const result = await query(
        `DELETE FROM teams WHERE id = $1 RETURNING id`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Team not found' });
      }

      return res.status(200).json({ success: true, deletedId: id });

    } catch (error) {
      console.error('Error deleting team:', error);
      return res.status(500).json({ 
        error: 'Failed to delete team',
        details: error.message 
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// Helper to generate temporary password
function generateTemporaryPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Helper to convert camelCase to snake_case
function camelToSnake(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// Helper to format database row to consistent team object
async function formatTeam(row) {
  // Fetch related data
  const [playersResult, revenueResult, messagesResult] = await Promise.all([
    query(`SELECT * FROM team_players WHERE team_id = $1 ORDER BY created_at`, [row.id]),
    query(`SELECT * FROM team_revenue WHERE team_id = $1 ORDER BY created_at DESC`, [row.id]),
    query(`SELECT * FROM team_messages WHERE team_id = $1 ORDER BY created_at DESC`, [row.id])
  ]);

  return {
    id: row.id,
    formSubmissionId: row.form_submission_id,
    teamName: row.team_name,
    coachName: row.coach_name || row.manager_name,
    managerName: row.manager_name,
    managerPhone: row.manager_phone,
    email: row.email,
    phone: row.phone || row.manager_phone,
    suburb: row.suburb,
    teamLogo: row.team_logo,
    shirtDesign: row.shirt_design,
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    sponsorLogo: row.sponsor_logo,
    numberOfTeams: row.number_of_teams,
    ageGroupTeams: typeof row.age_group_teams === 'string' ? JSON.parse(row.age_group_teams) : (row.age_group_teams || []),
    subTeams: typeof row.age_group_teams === 'string' ? JSON.parse(row.age_group_teams) : (row.age_group_teams || []),
    kitPricing: typeof row.kit_pricing === 'string' ? JSON.parse(row.kit_pricing) : (row.kit_pricing || {}),
    entryFee: typeof row.entry_fee === 'string' ? JSON.parse(row.entry_fee) : (row.entry_fee || {}),
    submissionData: typeof row.submission_data === 'string' ? JSON.parse(row.submission_data) : (row.submission_data || {}),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLogin: row.last_login,
    players: playersResult.rows.map(p => ({
      id: p.id,
      subTeam: p.sub_team,
      playerName: p.player_name,
      playerEmail: p.player_email,
      playerPhone: p.player_phone,
      idNumber: p.id_number,
      jerseySize: p.jersey_size,
      jerseyNumber: p.jersey_number,
      position: p.position,
      registrationData: typeof p.registration_data === 'string' ? JSON.parse(p.registration_data) : p.registration_data
    })),
    revenue: revenueResult.rows.map(r => ({
      id: r.id,
      type: r.revenue_type,
      amount: parseFloat(r.amount),
      description: r.description,
      referenceId: r.reference_id,
      date: r.created_at
    })),
    messages: messagesResult.rows.map(m => ({
      id: m.id,
      subject: m.subject,
      message: m.message,
      isRead: m.is_read,
      createdAt: m.created_at
    }))
  };
}
