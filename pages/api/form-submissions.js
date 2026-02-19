// Database-only form submissions API
// This is the main entry point for form submissions - it saves to database and creates teams

import { query } from '../../lib/db';
import { sendRegistrationEmail } from '../../lib/email';
import { getFormTemplateById } from '../../data/forms';
import { createProfile, getProfileByEmail, updateProfile } from '../../data/customers-db';
import { logApiError, logFormEvent } from '../../lib/logger';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb'
    }
  }
};

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { formId, data, cartItems, cartTotal } = req.body;

      if (!formId || !data) {
        return res.status(400).json({ error: 'Form ID and data are required' });
      }

      // For player registration (form 2), include cart data in submission
      if (formId === 2 && cartItems && Array.isArray(cartItems)) {
        data._cartItems = cartItems;
        data._cartTotal = cartTotal || 0;
      }

      const form = getFormTemplateById(formId);
      if (!form) {
        return res.status(404).json({ error: 'Form not found' });
      }

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
            try {
              const parsed = JSON.parse(trimmed);
              teamSubmissionId = parsed.id
                || parsed.submissionId
                || parsed.formSubmissionId
                || teamSubmissionId;
              resolvedTeamName = parsed.teamName
                || parsed.label
                || parsed.name
                || '';
            } catch (parseError) {
              resolvedTeamName = '';
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

      const handlePlayerRegistration = async (playerData, submissionData) => {
        const existingProfile = playerData.existingCricClubsProfile;
        const teamSelectionValue = playerData[8] || playerData['8'] || null;
        const { teamSubmissionId, teamName } = await resolveTeamSelection(teamSelectionValue);

        if (!existingProfile || existingProfile === null) {
          try {
            const playerName = playerData[6] || playerData['6'] || '';
            const email = playerData[7] || playerData['7'] || playerData[4] || playerData['4'] || '';
            const dob = playerData[10] || playerData['10'] || '';

            const host = req.headers.host || '';
            const protocol = req.headers['x-forwarded-proto'] || 'http';
            const baseUrl = host ? `${protocol}://${host}` : (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000');
            await fetch(`${baseUrl}/api/new-players`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                playerName,
                email,
                team: teamName,
                dob,
                submissionId: submissionData?.id || ''
              })
            });
            console.log('New player recorded for CricClubs upload:', playerName);
          } catch (newPlayerError) {
            console.log('Could not record new player:', newPlayerError.message);
          }
        } else {
          console.log('Player selected existing CricClubs profile:', existingProfile.name);
        }

        const parentName = playerData[37] || playerData['37'] || '';
        const parentEmail = playerData[38] || playerData['38'] || playerData.checkout_email || '';
        const parentPassword = playerData[39] || playerData['39'] || playerData.checkout_password || '';
        const parentPhone = playerData[40] || playerData['40'] || playerData.checkout_phone || '';
        const playerName = playerData[6] || playerData['6'] || '';
        const jerseyNumber = playerData[36] || playerData['36'] || null;
        const jerseySize = playerData['25_shirtSize'] || '';

        let matchedTeam = null;
        try {
          // Primary match: by team name (always available before player registration)
          if (teamName) {
            const teamResult = await query(
              `SELECT id, team_name FROM teams WHERE LOWER(team_name) = LOWER($1) LIMIT 1`,
              [teamName]
            );
            matchedTeam = teamResult.rows[0] || null;
          }
          // Fallback: by form_submission_uuid if team name didn't match
          if (!matchedTeam && teamSubmissionId) {
            const teamResult = await query(
              `SELECT id, team_name FROM teams WHERE form_submission_uuid::text = $1 LIMIT 1`,
              [String(teamSubmissionId)]
            );
            matchedTeam = teamResult.rows[0] || null;
          }
        } catch (teamLookupError) {
          console.log('Could not match team for player registration:', teamLookupError.message);
        }

        let subTeam = '';
        const subTeamValue = playerData[34] || playerData['34'] || '';
        const buildSubTeamLabel = (obj) => {
          if (!obj) return '';
          const name = (obj.teamName || '').trim();
          const gender = (obj.gender || '').trim();
          const age = (obj.ageGroup || '').trim();
          if (name && gender && age) return `${name} (${gender} - ${age})`;
          if (name && age) return `${name} (${age})`;
          return name || age || gender || '';
        };
        if (subTeamValue && typeof subTeamValue === 'object') {
          subTeam = buildSubTeamLabel(subTeamValue);
        } else if (typeof subTeamValue === 'string') {
          try {
            const parsedSubTeam = JSON.parse(subTeamValue);
            subTeam = buildSubTeamLabel(parsedSubTeam);
          } catch (parseError) {
            subTeam = subTeamValue.trim();
          }
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
            } else if (existingCustomer && !existingCustomer.teamId && matchedTeam?.id) {
              await updateProfile(existingCustomer.id, { teamId: matchedTeam.id });
            }
          } catch (profileError) {
            console.log('Could not create customer profile:', profileError.message);
          }
        }

        if (matchedTeam && playerName) {
          try {
            let hasExistingPlayer = false;
            try {
              const existingPlayer = await query(
                `SELECT id FROM team_players WHERE registration_data->>'formSubmissionId' = $1 LIMIT 1`,
                [String(submissionData?.id || '')]
              );
              hasExistingPlayer = existingPlayer.rows.length > 0;
            } catch (lookupError) {
              hasExistingPlayer = false;
            }

            if (!hasExistingPlayer) {
              const registrationData = {
                formSubmissionId: submissionData?.id || null,
                formId: formId,
                parentEmail,
                parentPhone,
                teamName: matchedTeam?.team_name || teamName || null,
                subTeam,
                profileImage: playerData[46] || playerData['46'] || null
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

              // Record kit markup revenue for the team
              try {
                const teamRow = await query(
                  `SELECT kit_pricing FROM teams WHERE id = $1`,
                  [matchedTeam.id]
                );
                const kitPricing = teamRow.rows[0]?.kit_pricing;
                if (kitPricing) {
                  const pricing = typeof kitPricing === 'string' ? JSON.parse(kitPricing) : kitPricing;
                  const markup = parseFloat(pricing.markup) || 0;
                  if (markup > 0) {
                    await query(
                      `INSERT INTO team_revenue (team_id, revenue_type, amount, description, reference_id)
                       VALUES ($1, $2, $3, $4, $5)`,
                      [
                        matchedTeam.id,
                        'player-registration-markup',
                        markup,
                        `Kit markup for player: ${playerName}`,
                        String(submissionData?.id || '')
                      ]
                    );
                    console.log(`Recorded R${markup} kit markup revenue for team ${matchedTeam.id}, player: ${playerName}`);
                  }
                }
              } catch (revenueError) {
                console.log('Could not record kit markup revenue:', revenueError.message);
              }
            }
          } catch (playerInsertError) {
            console.log('Could not create team player:', playerInsertError.message);
          }
        }
      };

      // Get customer email from form data (field ID 3 for team registration)
      const customerEmail =
        data[3] ||
        data['3'] ||
        data[38] ||
        data['38'] ||
        data.checkout_email ||
        data.email ||
        null;

      if (formId === 2 || formId === '2') {
        const playerEntriesRaw = data[45] || data['45'];
        const playerEntries = Array.isArray(playerEntriesRaw) ? playerEntriesRaw : [];
        if (playerEntries.length > 0) {
          const profiles = Array.isArray(data.existingCricClubsProfiles) ? data.existingCricClubsProfiles : [];
          const submissions = [];

          for (let index = 0; index < playerEntries.length; index += 1) {
            const entry = playerEntries[index] || {};
            const playerData = { ...data };
            delete playerData[45];
            delete playerData['45'];
            delete playerData.existingCricClubsProfiles;

            playerData[6] = entry.playerName || '';
            playerData[34] = entry.subTeam || '';
            playerData[10] = entry.dob || '';
            playerData[43] = entry.birthCertificate || '';
            playerData[36] = entry.shirtNumber || '';
            playerData[46] = entry.profileImage || '';
            playerData['25_shirtSize'] = entry.shirtSize || '';
            playerData['25_pantsSize'] = entry.pantsSize || '';
            playerData.existingCricClubsProfile = profiles[index] || null;

            let submission = null;
            try {
              const submissionResult = await insertFormSubmission({
                formId,
                formName: form.name,
                data: playerData,
                customerEmail
              });

              submission = {
                id: submissionResult.rows[0].id,
                shortId: String(submissionResult.rows[0].id || '').slice(-4),
                formId: parseInt(formId),
                formName: form.name,
                data: playerData,
                submittedAt: submissionResult.rows[0].created_at,
                status: submissionResult.rows[0].status || 'pending',
                approvalStatus: submissionResult.rows[0].approval_status || 'pending'
              };
            } catch (dbError) {
              console.error('Database error saving submission:', dbError);
              return res.status(500).json({ error: 'Failed to save submission to database', details: dbError.message });
            }

            await handlePlayerRegistration(playerData, submission);
            submissions.push(submission);
          }

          return res.status(200).json({
            success: true,
            submission: submissions[0] || null,
            submissions
          });
        }
      }

      // Save submission to database (supports both legacy and newer schemas)
      let submission = null;
      try {
        const submissionResult = await insertFormSubmission({
          formId,
          formName: form.name,
          data,
          customerEmail
        });

        submission = {
          id: submissionResult.rows[0].id,
          shortId: String(submissionResult.rows[0].id || '').slice(-4),
          formId: parseInt(formId),
          formName: form.name,
          data: data,
          submittedAt: submissionResult.rows[0].created_at,
          status: submissionResult.rows[0].status || 'pending',
          approvalStatus: submissionResult.rows[0].approval_status || 'pending'
        };
      } catch (dbError) {
        console.error('Database error saving submission:', dbError);
        return res.status(500).json({ error: 'Failed to save submission to database', details: dbError.message });
      }

      // If this is a Team Registration form (id: 1), create a team profile
      let teamProfile = null;
      if (formId === 1 || formId === '1') {
        const email = data[3] || data['3'] || '';
        const teamName = data[1] || data['1'] || '';
        
        // Check if team already exists
        try {
          const existingTeam = await query(
            `SELECT * FROM teams WHERE LOWER(email) = LOWER($1) OR LOWER(team_name) = LOWER($2)`,
            [email, teamName]
          );
          
          if (existingTeam.rows.length > 0) {
            // Return existing team info
            const existing = existingTeam.rows[0];
            teamProfile = {
              id: existing.id,
              teamName: existing.team_name,
              email: existing.email,
              password: existing.password,
              isExisting: true
            };
          } else {
            // Create new team
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

            const teamInsertValues = [
              submission?.id ?? null,
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
            ];

            const submissionUuid = submission?.id ?? null;

            const teamResult = await query(
              `INSERT INTO teams (
                form_submission_uuid, team_name, manager_name, manager_phone, email, suburb,
                team_logo, shirt_design, primary_color, secondary_color, sponsor_logo,
                number_of_teams, age_group_teams, kit_pricing, entry_fee, password, submission_data, status
              ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
              RETURNING *`,
              [submissionUuid, ...teamInsertValues.slice(1)]
            );

            const newTeam = teamResult.rows[0];
            teamProfile = {
              id: newTeam.id,
              teamName: newTeam.team_name,
              email: newTeam.email,
              password: password,
              isExisting: false
            };

          }
        } catch (teamError) {
          console.error('Error creating team:', teamError);
          // Continue without team profile - submission was still saved
        }
      }

      if (formId === 1 || formId === '1') {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://winterleaguecricket.co.za';
          const email = teamProfile?.email || data[3] || data['3'] || '';
          const teamName = teamProfile?.teamName || data[1] || data['1'] || '';
          const coachName = data[2] || data['2'] || '';
          const password = teamProfile?.password || '';

          if (email && teamName) {
            const emailResult = await sendRegistrationEmail({
              teamName,
              coachName,
              email,
              password,
              registrationId: submission.id,
              loginUrl: `${baseUrl}/team-portal`
            });
            console.log('Registration email result:', emailResult.message || emailResult.error || emailResult);
          } else {
            console.log('Registration email skipped: missing teamName or email');
          }
        } catch (emailError) {
          // Don't fail the submission if email fails
          console.log('Could not send registration email:', emailError.message);
        }
      }

      if (formId === 2 || formId === '2') {
        await handlePlayerRegistration(data, submission);
      }

      // Log successful form submission event
      logFormEvent({ formId, formName: form?.name, email: data[3] || data[38] || null, action: 'submit' });

      return res.status(200).json({
        success: true,
        submission: submission,
        teamProfile: teamProfile
      });

    } catch (error) {
      console.error('Form submission error:', error);
      logApiError({ method: req.method, url: req.url, statusCode: 500, error, body: { formId: req.body?.formId } });
      return res.status(500).json({ error: 'Failed to submit form', details: error.message });
    }
  }

  if (req.method === 'GET') {
    try {
      const { formId } = req.query;
      
      let sql = `SELECT * FROM form_submissions`;
      const params = [];
      
      if (formId) {
        sql += ` WHERE form_id = $1`;
        params.push(formId.toString());
      }
      
      sql += ` ORDER BY created_at DESC`;
      
      const result = await query(sql, params);
      
      const submissions = result.rows.map(row => ({
        id: row.id,
        formId: parseInt(row.form_id) || 1,
        formName: row.form_name,
        data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
        customerEmail: row.customer_email,
        status: row.status || 'pending',
        approvalStatus: row.approval_status || 'pending',
        submittedAt: row.created_at,
        updatedAt: row.updated_at
      }));
      
      return res.status(200).json({ submissions });
      
    } catch (error) {
      console.error('Error fetching submissions:', error);
      return res.status(500).json({ error: 'Failed to fetch submissions', details: error.message });
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

async function insertFormSubmission({ formId, formName, data, customerEmail }) {
  const dataJson = JSON.stringify(data);
  const formIdValue = formId?.toString?.() ?? null;

  const insertWithApproval = (idValue) => query(
    `INSERT INTO form_submissions (form_id, form_name, data, customer_email, status, approval_status)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [idValue, formName, dataJson, customerEmail, 'pending', 'pending']
  );

  const insertWithoutApproval = (idValue) => query(
    `INSERT INTO form_submissions (form_id, form_name, data, customer_email, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [idValue, formName, dataJson, customerEmail, 'pending']
  );

  let useApproval = true;
  let idValue = formIdValue;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await (useApproval ? insertWithApproval(idValue) : insertWithoutApproval(idValue));
    } catch (error) {
      const message = String(error.message || '').toLowerCase();

      if (useApproval && error.code === '42703' && message.includes('approval_status')) {
        useApproval = false;
        continue;
      }

      if (idValue !== null && (error.code === '22P02' || error.code === '23503') && (message.includes('form_id') || message.includes('uuid'))) {
        idValue = null;
        continue;
      }

      throw error;
    }
  }

  throw new Error('Unable to insert form submission');
}
