import fs from 'fs';
import path from 'path';
import { query } from '../../lib/db';
import { createProfile, getProfileByEmail } from '../../data/customers-db';

const DATA_FILE = path.join(process.cwd(), 'data', 'newPlayers.json');

const loadNewPlayers = () => {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading new players:', error);
  }
  return [];
};

const saveNewPlayers = (players) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(players, null, 2));
  } catch (error) {
    console.error('Error saving new players:', error);
  }
};

const parseJsonSafe = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
};

const resolveTeamSelection = async (teamSelectionValue) => {
  let teamSubmissionId = null;
  let resolvedTeamName = '';

  if (teamSelectionValue && typeof teamSelectionValue === 'object') {
    teamSubmissionId = teamSelectionValue.id
      || teamSelectionValue.submissionId
      || teamSelectionValue.formSubmissionId
      || null;
    resolvedTeamName = teamSelectionValue.teamName
      || teamSelectionValue.label
      || teamSelectionValue.name
      || '';
  } else if (typeof teamSelectionValue === 'string') {
    const trimmed = teamSelectionValue.trim();
    teamSubmissionId = trimmed || null;
    if (trimmed.startsWith('{')) {
      const parsed = parseJsonSafe(trimmed);
      if (parsed) {
        teamSubmissionId = parsed.id
          || parsed.submissionId
          || parsed.formSubmissionId
          || teamSubmissionId;
        resolvedTeamName = parsed.teamName
          || parsed.label
          || parsed.name
          || '';
      }
    }
  }

  if (!resolvedTeamName && teamSubmissionId) {
    try {
      const submissionResult = await query(
        `SELECT data FROM form_submissions WHERE id::text = $1 LIMIT 1`,
        [String(teamSubmissionId)]
      );
      if (submissionResult.rows.length > 0) {
        const rawData = submissionResult.rows[0].data;
        const submissionData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
        resolvedTeamName = submissionData?.[1] || submissionData?.['1'] || '';
      }
    } catch (lookupError) {
      console.log('Could not resolve team selection from submission:', lookupError.message);
    }
  }

  return { teamSubmissionId, teamName: resolvedTeamName };
};

const resolveSubTeam = (value) => {
  if (!value) return '';
  if (typeof value === 'object') {
    return value.teamName || value.ageGroup || value.gender || '';
  }
  if (typeof value === 'string') {
    const parsed = parseJsonSafe(value);
    if (parsed) {
      return parsed.teamName || parsed.ageGroup || parsed.gender || '';
    }
    return value;
  }
  return String(value);
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const submissionsResult = await query(
      `SELECT id, data FROM form_submissions WHERE form_id = $1 ORDER BY created_at DESC`,
      ['2']
    );

    const existingNewPlayers = loadNewPlayers();
    const updatedNewPlayers = [...existingNewPlayers];

    let submissionsChecked = 0;
    let playersInserted = 0;
    let profilesCreated = 0;
    let newPlayersAdded = 0;
    let missingTeams = 0;

    for (const row of submissionsResult.rows) {
      submissionsChecked += 1;
      const submissionId = row.id;
      const data = typeof row.data === 'string' ? JSON.parse(row.data) : (row.data || {});

      const parentName = data[37] || data['37'] || '';
      const parentEmail = data[38] || data['38'] || data.checkout_email || '';
      const parentPassword = data[39] || data['39'] || data.checkout_password || '';
      const parentPhone = data[40] || data['40'] || data.checkout_phone || '';
      const playerName = data[6] || data['6'] || '';
      const jerseyNumber = data[36] || data['36'] || null;
      const jerseySize = data['25_shirtSize'] || '';
      const existingProfile = data.existingCricClubsProfile;

      const teamSelectionValue = data[8] || data['8'] || null;
      const { teamSubmissionId, teamName } = await resolveTeamSelection(teamSelectionValue);
      const subTeam = resolveSubTeam(data[34] || data['34'] || '');

      let matchedTeam = null;
      try {
        if (teamSubmissionId) {
          const teamResult = await query(
            `SELECT id, team_name FROM teams WHERE form_submission_id::text = $1 LIMIT 1`,
            [String(teamSubmissionId)]
          );
          matchedTeam = teamResult.rows[0] || null;
        }
        if (!matchedTeam && teamName) {
          const teamResult = await query(
            `SELECT id, team_name FROM teams WHERE LOWER(team_name) = LOWER($1) LIMIT 1`,
            [teamName]
          );
          matchedTeam = teamResult.rows[0] || null;
        }
      } catch (teamLookupError) {
        console.log('Resync team lookup failed:', teamLookupError.message);
      }

      if (!matchedTeam) {
        missingTeams += 1;
      }

      if (parentEmail && parentPassword) {
        try {
          const existingCustomer = await getProfileByEmail(parentEmail);
          if (!existingCustomer) {
            const parts = String(parentName || '').trim().split(/\s+/).filter(Boolean);
            const firstName = parts.shift() || '';
            const lastName = parts.join(' ') || '';

            await createProfile({
              email: parentEmail,
              password: parentPassword,
              firstName,
              lastName,
              phone: parentPhone,
              teamId: matchedTeam?.id || null
            });
            profilesCreated += 1;
          }
        } catch (profileError) {
          console.log('Resync profile failed:', profileError.message);
        }
      }

      if (matchedTeam && playerName) {
        try {
          const existingPlayer = await query(
            `SELECT id FROM team_players WHERE registration_data->>'formSubmissionId' = $1 LIMIT 1`,
            [String(submissionId || '')]
          );

          if (existingPlayer.rows.length === 0) {
            const registrationData = {
              formSubmissionId: submissionId || null,
              formId: 2,
              parentEmail,
              parentPhone,
              teamName: matchedTeam?.team_name || teamName || null,
              subTeam
            };

            await query(
              `INSERT INTO team_players (
                team_id, sub_team, player_name, player_email, player_phone,
                jersey_size, jersey_number, registration_data
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [
                matchedTeam.id,
                subTeam || null,
                playerName,
                parentEmail || null,
                parentPhone || null,
                jerseySize || null,
                jerseyNumber || null,
                JSON.stringify(registrationData)
              ]
            );
            playersInserted += 1;
          }
        } catch (playerInsertError) {
          console.log('Resync team player failed:', playerInsertError.message);
        }
      }

      if (!existingProfile || existingProfile === null) {
        const alreadyRecorded = updatedNewPlayers.some(
          (player) => String(player.submissionId) === String(submissionId)
        );

        if (!alreadyRecorded && playerName) {
          updatedNewPlayers.push({
            id: Date.now().toString() + Math.random().toString(16).slice(2),
            playerName,
            email: parentEmail || '',
            team: teamName || '',
            dob: data[10] || data['10'] || '',
            submissionId: String(submissionId || ''),
            registrationDate: new Date().toISOString(),
            uploadedToCricClubs: false
          });
          newPlayersAdded += 1;
        }
      }
    }

    if (newPlayersAdded > 0) {
      saveNewPlayers(updatedNewPlayers);
    }

    return res.status(200).json({
      success: true,
      submissionsChecked,
      playersInserted,
      profilesCreated,
      newPlayersAdded,
      missingTeams
    });
  } catch (error) {
    console.error('Error resyncing player registrations:', error);
    return res.status(500).json({
      error: 'Failed to resync player registrations',
      details: error.message
    });
  }
}
