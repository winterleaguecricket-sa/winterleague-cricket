// Migration script to create teams from existing form submissions
// This is a one-time migration to populate teams table from form_submissions

import { query } from '../../lib/db';

function generateTemporaryPassword() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    // Get all form submissions for Team Registration (formId = 1)
    const submissionsResult = await query(
      `SELECT * FROM form_submissions WHERE form_id = '1' OR form_id = 1 ORDER BY created_at ASC`
    );

    if (submissionsResult.rows.length === 0) {
      return res.status(200).json({ 
        message: 'No Team Registration submissions found',
        created: 0,
        skipped: 0
      });
    }

    let created = 0;
    let skipped = 0;
    const results = [];

    for (const row of submissionsResult.rows) {
      const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
      
      const email = data[3] || data['3'] || '';
      const teamName = data[1] || data['1'] || '';
      
      if (!email && !teamName) {
        results.push({ submissionId: row.id, status: 'skipped', reason: 'No email or team name' });
        skipped++;
        continue;
      }

      // Check if team already exists
      const existingTeam = await query(
        `SELECT * FROM teams WHERE LOWER(email) = LOWER($1) OR LOWER(team_name) = LOWER($2)`,
        [email, teamName]
      );

      if (existingTeam.rows.length > 0) {
        results.push({ 
          submissionId: row.id, 
          status: 'skipped', 
          reason: 'Team already exists',
          existingTeamId: existingTeam.rows[0].id
        });
        skipped++;
        continue;
      }

      // Create the team
      const password = generateTemporaryPassword();
      const managerName = data[2] || data['2'] || '';
      const managerPhone = data[35] || data['35'] || '';
      const suburb = data[5] || data['5'] || '';
      const teamLogo = data[22] || data['22'] || '';
      const shirtDesign = data[23] || data['23'] || '';
      const primaryColor = data['23_primaryColor'] || '';
      const secondaryColor = data['23_secondaryColor'] || '';
      const sponsorLogo = data[30] || data['30'] || '';
      const numberOfTeams = parseInt(data[32] || data['32'] || 1);
      const ageGroupTeams = data[33] || data['33'] || [];
      const kitPricing = {
        basePrice: data['29_basePrice'] || 150,
        markup: data['29_markup'] || 0
      };
      const entryFee = {
        baseFee: data['31_baseFee'] || 500
      };

      try {
        const teamResult = await query(
          `INSERT INTO teams (
            form_submission_id, team_name, manager_name, manager_phone, email, suburb,
            team_logo, shirt_design, primary_color, secondary_color, sponsor_logo,
            number_of_teams, age_group_teams, kit_pricing, entry_fee, password, submission_data, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
          RETURNING *`,
          [
            row.id,
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
            JSON.stringify(data),
            'pending'
          ]
        );

        results.push({
          submissionId: row.id,
          status: 'created',
          teamId: teamResult.rows[0].id,
          teamName: teamName,
          email: email,
          password: password
        });
        created++;
      } catch (insertError) {
        results.push({
          submissionId: row.id,
          status: 'error',
          reason: insertError.message
        });
      }
    }

    return res.status(200).json({
      message: `Migration complete. Created ${created} teams, skipped ${skipped}.`,
      created,
      skipped,
      total: submissionsResult.rows.length,
      results
    });

  } catch (error) {
    console.error('Migration error:', error);
    return res.status(500).json({ error: 'Migration failed', details: error.message });
  }
}
