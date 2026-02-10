import { query } from '../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  const providedPassword = req.headers['x-admin-password'];

  if (!adminPassword || providedPassword !== adminPassword) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const submissionsResult = await query(
      `SELECT id, data, status FROM form_submissions WHERE form_id::text = '1' ORDER BY created_at DESC`
    );

    const teamsResult = await query(
      `SELECT id, team_name, email, form_submission_id, status FROM teams`
    );

    const teamsBySubmission = new Map();
    const teamsByEmail = new Map();
    const teamsByName = new Map();
    const allTeamIds = new Set();

    teamsResult.rows.forEach(row => {
      const idText = String(row.id);
      allTeamIds.add(idText);
      if (row.form_submission_id) {
        teamsBySubmission.set(String(row.form_submission_id), idText);
      }
      if (row.email) {
        teamsByEmail.set(String(row.email).toLowerCase(), idText);
      }
      if (row.team_name) {
        teamsByName.set(String(row.team_name).toLowerCase(), idText);
      }
    });

    let updated = 0;
    let inserted = 0;
    let archived = 0;
    let skipped = 0;
    const matchedTeamIds = new Set();

    for (const row of submissionsResult.rows) {
      const submissionData = typeof row.data === 'string' ? safeJsonParse(row.data) : row.data || {};
      const teamUpdates = extractTeamUpdatesFromSubmission(submissionData);
      const submissionIdText = String(row.id);
      const submissionIdValue = normalizeSubmissionId(submissionIdText);

      let matchedTeamId = teamsBySubmission.get(submissionIdText) || null;
      if (!matchedTeamId && teamUpdates.email) {
        matchedTeamId = teamsByEmail.get(String(teamUpdates.email).toLowerCase()) || null;
      }
      if (!matchedTeamId && teamUpdates.teamName) {
        matchedTeamId = teamsByName.get(String(teamUpdates.teamName).toLowerCase()) || null;
      }

      if (matchedTeamId) {
        const updateResult = await query(
          `UPDATE teams SET
            team_name = $1,
            manager_name = $2,
            manager_phone = $3,
            email = $4,
            suburb = $5,
            team_logo = $6,
            shirt_design = $7,
            primary_color = $8,
            secondary_color = $9,
            sponsor_logo = $10,
            number_of_teams = $11,
            age_group_teams = $12,
            kit_pricing = $13,
            entry_fee = $14,
            submission_data = $15,
            status = $16,
            form_submission_id = COALESCE($17, form_submission_id),
            updated_at = CURRENT_TIMESTAMP
           WHERE id::text = $18`,
          [
            teamUpdates.teamName,
            teamUpdates.managerName,
            teamUpdates.managerPhone,
            teamUpdates.email,
            teamUpdates.suburb,
            teamUpdates.teamLogo,
            teamUpdates.shirtDesign,
            teamUpdates.primaryColor,
            teamUpdates.secondaryColor,
            teamUpdates.sponsorLogo,
            teamUpdates.numberOfTeams,
            JSON.stringify(teamUpdates.ageGroupTeams),
            JSON.stringify(teamUpdates.kitPricing),
            JSON.stringify(teamUpdates.entryFee),
            JSON.stringify(teamUpdates.submissionData),
            row.status || 'pending',
            submissionIdValue,
            matchedTeamId
          ]
        );

        if (updateResult.rowCount > 0) {
          updated += 1;
          matchedTeamIds.add(matchedTeamId);
          continue;
        }
      }

      if (!teamUpdates.teamName && !teamUpdates.email) {
        skipped += 1;
        continue;
      }

      const password = generateTemporaryPassword();
      const insertResult = await query(
        `INSERT INTO teams (
          form_submission_id, team_name, manager_name, manager_phone, email, suburb,
          team_logo, shirt_design, primary_color, secondary_color, sponsor_logo,
          number_of_teams, age_group_teams, kit_pricing, entry_fee, password, submission_data, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING id`,
        [
          submissionIdValue,
          teamUpdates.teamName,
          teamUpdates.managerName,
          teamUpdates.managerPhone,
          teamUpdates.email,
          teamUpdates.suburb,
          teamUpdates.teamLogo,
          teamUpdates.shirtDesign,
          teamUpdates.primaryColor,
          teamUpdates.secondaryColor,
          teamUpdates.sponsorLogo,
          teamUpdates.numberOfTeams,
          JSON.stringify(teamUpdates.ageGroupTeams),
          JSON.stringify(teamUpdates.kitPricing),
          JSON.stringify(teamUpdates.entryFee),
          password,
          JSON.stringify(teamUpdates.submissionData),
          row.status || 'pending'
        ]
      );

      if (insertResult.rowCount > 0) {
        inserted += 1;
        matchedTeamIds.add(String(insertResult.rows[0].id));
      } else {
        skipped += 1;
      }
    }

    const orphanIds = [...allTeamIds].filter(id => !matchedTeamIds.has(id));
    if (orphanIds.length > 0) {
      const archiveResult = await query(
        `UPDATE teams SET status = 'archived', updated_at = CURRENT_TIMESTAMP
         WHERE id::text = ANY($1)`,
        [orphanIds]
      );
      archived = archiveResult.rowCount || 0;
    }

    return res.status(200).json({
      success: true,
      updated,
      inserted,
      archived,
      skipped,
      total: submissionsResult.rows.length
    });
  } catch (error) {
    console.error('Error resyncing teams:', error);
    return res.status(500).json({ error: 'Failed to resync teams', details: error.message });
  }
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return {};
  }
}

function extractTeamUpdatesFromSubmission(data) {
  const baseRaw = data['29_basePrice'] ?? data["29_basePrice"];
  const markupRaw = data['29_markup'] ?? data["29_markup"];
  const basePrice = Number.isFinite(parseFloat(baseRaw)) ? parseFloat(baseRaw) : 150;
  const markup = Number.isFinite(parseFloat(markupRaw)) ? parseFloat(markupRaw) : 0;
  const entryRaw = data['31_baseFee'] ?? data["31_baseFee"];
  const baseFee = Number.isFinite(parseFloat(entryRaw)) ? parseFloat(entryRaw) : 500;

  return {
    teamName: data['1'] || data[1] || data.teamName || '',
    managerName: data['2'] || data[2] || data.managerName || '',
    managerPhone: data['35'] || data[35] || data.managerPhone || '',
    email: data['3'] || data[3] || data.email || '',
    suburb: data['5'] || data[5] || data.suburb || '',
    teamLogo: data['22'] || data[22] || data.teamLogo || '',
    shirtDesign: data['23'] || data[23] || data.shirtDesign || '',
    primaryColor: data['23_primaryColor'] || data.primaryColor || '',
    secondaryColor: data['23_secondaryColor'] || data.secondaryColor || '',
    sponsorLogo: data['30'] || data[30] || data.sponsorLogo || '',
    numberOfTeams: parseInt(data['32'] || data[32] || data.numberOfTeams || 1, 10),
    ageGroupTeams: data['33'] || data[33] || data.ageGroupTeams || [],
    kitPricing: { basePrice, markup },
    entryFee: { baseFee },
    submissionData: data
  };
}

function generateTemporaryPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

function normalizeSubmissionId(rawId) {
  if (rawId === null || rawId === undefined) return null;
  const asNumber = Number(rawId);
  if (Number.isInteger(asNumber) && String(asNumber) === String(rawId)) {
    return asNumber;
  }
  return null;
}
