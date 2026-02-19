import { query } from '../../lib/db';
import { createProfile, getProfileByEmail } from '../../data/customers-db';

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

const buildSubTeamLabel = (obj) => {
  if (!obj) return '';
  const name = (obj.teamName || '').trim();
  const gender = (obj.gender || '').trim();
  const age = (obj.ageGroup || '').trim();
  if (name && gender && age) return `${name} (${gender} - ${age})`;
  if (name && age) return `${name} (${age})`;
  return name || age || gender || '';
};

const resolveSubTeam = (value) => {
  if (!value) return '';
  if (typeof value === 'object') {
    return buildSubTeamLabel(value);
  }
  if (typeof value === 'string') {
    const parsed = parseJsonSafe(value);
    if (parsed) {
      return buildSubTeamLabel(parsed);
    }
    return value.trim();
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
        if (teamName) {
          const teamResult = await query(
            `SELECT id, team_name FROM teams WHERE LOWER(team_name) = LOWER($1) LIMIT 1`,
            [teamName]
          );
          matchedTeam = teamResult.rows[0] || null;
        }
        if (!matchedTeam && teamSubmissionId) {
          const teamResult = await query(
            `SELECT id, team_name FROM teams WHERE form_submission_uuid::text = $1 LIMIT 1`,
            [String(teamSubmissionId)]
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
        if (playerName) {
          try {
            const alreadyRecorded = await query(
              `SELECT id FROM new_players WHERE submission_id = $1 LIMIT 1`,
              [String(submissionId || '')]
            );

            if (alreadyRecorded.rows.length === 0) {
              await query(
                `INSERT INTO new_players (player_name, email, team, dob, submission_id, registration_date)
                 VALUES ($1, $2, $3, $4, $5, NOW())`,
                [
                  playerName,
                  parentEmail || '',
                  teamName || '',
                  data[10] || data['10'] || '',
                  String(submissionId || '')
                ]
              );
              newPlayersAdded += 1;
            }
          } catch (newPlayerError) {
            console.log('Resync new player insert failed:', newPlayerError.message);
          }
        }
      }
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
