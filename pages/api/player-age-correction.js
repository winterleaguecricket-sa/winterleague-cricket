// API to check and correct player age/DOB issues
// GET: Returns flagged players for a parent email
// POST: Updates DOB, age group, and/or birth certificate for a player
import { query } from '../../lib/db';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Allow birth certificate uploads
    },
  },
};

const AGE_CUTOFFS = {
  'U9':  2017,
  'U11': 2015,
  'U13': 2013,
  'U15': 2011,
  'U17': 2009,
};

export default async function handler(req, res) {
  // GET: Check a parent's players for age/DOB issues
  if (req.method === 'GET') {
    try {
      const { email } = req.query;
      if (!email) return res.status(400).json({ error: 'Email required' });

      // Get all player registration submissions for this parent
      const result = await query(`
        SELECT 
          fs.id,
          fs.data->>'6' as player_name,
          fs.data->>'10' as dob,
          fs.data->>'34' as sub_team_raw,
          fs.data->>'36' as shirt_number,
          fs.data->>'40' as parent_phone,
          fs.data->>'43' as birth_certificate,
          fs.data->>'46' as profile_image,
          fs.data->>'25_shirtSize' as shirt_size,
          fs.data->>'25_pantsSize' as pants_size,
          fs.approval_status
        FROM form_submissions fs
        WHERE LOWER(fs.customer_email) = LOWER($1)
          AND fs.form_id = '2'
        ORDER BY fs.created_at DESC
      `, [email]);

      if (result.rows.length === 0) {
        return res.status(200).json({ flaggedPlayers: [], incompleteRegistrations: [] });
      }

      const today = new Date().toISOString().slice(0, 10);
      const currentYear = new Date().getFullYear();
      const flaggedPlayers = [];
      const incompleteRegistrations = [];

      for (const row of result.rows) {
        const playerName = (row.player_name || 'Unknown').trim();
        const dob = row.dob || '';
        let subTeamRaw = row.sub_team_raw;
        let ageGroup = '';
        let teamName = '';

        // Try to parse field 34 as JSON
        if (subTeamRaw && typeof subTeamRaw === 'string') {
          try {
            const parsed = JSON.parse(subTeamRaw);
            ageGroup = parsed.ageGroup || '';
            teamName = parsed.teamName || '';
          } catch (e) {
            // not JSON
          }
        }

        // Check if this is an incomplete registration (no age group, no proper DOB)
        const hasFutureDob = dob && dob > today;
        const hasMissingSubTeam = !ageGroup;
        const hasBadDob = !dob || hasFutureDob || parseInt(dob.substring(0, 4), 10) > currentYear - 4;

        if (hasMissingSubTeam && hasBadDob) {
          // This is a full data-recovery case (like Odis Naidoo)
          incompleteRegistrations.push({
            submissionId: row.id,
            playerName,
            dob,
            ageGroup: ageGroup || null,
            teamName: teamName || null,
            shirtNumber: row.shirt_number || '',
            parentPhone: row.parent_phone || '',
            hasBirthCertificate: !!row.birth_certificate,
            hasProfileImage: !!row.profile_image,
            shirtSize: row.shirt_size || '',
            pantsSize: row.pants_size || '',
            approvalStatus: row.approval_status,
          });
          continue;
        }

        // Check for invalid/impossible DOB (with valid age group — these aren't incomplete, just wrong DOB)
        // hasBadDob catches: no DOB, future DOB, or birth year within last 4 years (impossibly young)
        if (dob && ageGroup && hasBadDob) {
          flaggedPlayers.push({
            submissionId: row.id,
            playerName,
            dob,
            birthYear: parseInt(dob.substring(0, 4), 10),
            ageGroup,
            teamName,
            flagType: 'invalidDob',
            hasBirthCertificate: !!row.birth_certificate,
            approvalStatus: row.approval_status,
          });
          continue;
        }

        // Standard age verification check — player too old for their age group
        if (dob && ageGroup && ageGroup !== 'Senior') {
          const birthYear = parseInt(dob.substring(0, 4), 10);
          const cutoff = AGE_CUTOFFS[ageGroup];
          if (cutoff && birthYear < cutoff) {
            flaggedPlayers.push({
              submissionId: row.id,
              playerName,
              dob,
              birthYear,
              ageGroup,
              teamName,
              flagType: 'tooOld',
              cutoffYear: cutoff,
              tooOldBy: cutoff - birthYear,
              hasBirthCertificate: !!row.birth_certificate,
              approvalStatus: row.approval_status,
            });
          }
        }
      }

      // For incomplete registrations, get teams list for dropdown
      let teams = [];
      if (incompleteRegistrations.length > 0) {
        const teamsResult = await query(
          `SELECT t.id, t.team_name, t.form_submission_uuid, t.age_group_teams, t.submission_data
           FROM teams t 
           WHERE t.status != 'rejected'
           ORDER BY t.team_name`
        );

        teams = teamsResult.rows.map(t => {
          let ageGroups = [];
          if (t.submission_data) {
            const sd = typeof t.submission_data === 'string' ? JSON.parse(t.submission_data) : t.submission_data;
            const field33 = sd['33'] || sd[33];
            if (Array.isArray(field33) && field33.length > 0) ageGroups = field33;
          }
          if (ageGroups.length === 0) {
            const agt = typeof t.age_group_teams === 'string' ? JSON.parse(t.age_group_teams) : (t.age_group_teams || []);
            if (Array.isArray(agt)) ageGroups = agt;
          }
          return {
            id: t.id,
            teamName: t.team_name,
            formSubmissionUuid: t.form_submission_uuid,
            ageGroups: ageGroups.map(ag => ({
              teamName: (ag.teamName || t.team_name || '').trim(),
              gender: ag.gender || '',
              ageGroup: ag.ageGroup || '',
              coachName: ag.coachName || '',
              coachContact: ag.coachContact || '',
            }))
          };
        });
      }

      return res.status(200).json({ flaggedPlayers, incompleteRegistrations, teams });
    } catch (error) {
      console.error('Age correction check error:', error);
      return res.status(500).json({ error: 'Failed to check age verification' });
    }
  }

  // POST: Apply corrections
  if (req.method === 'POST') {
    try {
      const { submissionId, action, dob, ageGroup, teamName, gender, coachName, coachContact, birthCertificate, teamFormSubmissionUuid, playerName, shirtNumber, profileImage, parentPhone } = req.body;

      if (!submissionId) {
        return res.status(400).json({ error: 'Submission ID is required' });
      }

      // Verify the submission exists
      const existing = await query(
        `SELECT id, data, customer_email FROM form_submissions WHERE id = $1 AND form_id = '2'`,
        [submissionId]
      );
      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Player registration not found' });
      }

      const submissionData = typeof existing.rows[0].data === 'string'
        ? JSON.parse(existing.rows[0].data)
        : existing.rows[0].data;
      const customerEmail = existing.rows[0].customer_email;

      if (action === 'correct_dob') {
        // Parent is saying the DOB was wrong — update it
        if (!dob) return res.status(400).json({ error: 'New date of birth is required' });

        submissionData['10'] = dob;
        if (birthCertificate) {
          submissionData['43'] = birthCertificate;
        }

        await query(
          `UPDATE form_submissions SET data = $1, updated_at = NOW() WHERE id = $2`,
          [JSON.stringify(submissionData), submissionId]
        );

        return res.status(200).json({ success: true, message: 'Date of birth updated. Your profile is under review.' });
      }

      if (action === 'correct_age_group') {
        // Parent wants to move to correct age group
        if (!ageGroup || !teamName) return res.status(400).json({ error: 'Age group and team name are required' });

        const subTeamObj = {
          gender: gender || (submissionData['34'] ? (JSON.parse(typeof submissionData['34'] === 'string' ? submissionData['34'] : JSON.stringify(submissionData['34']))).gender : 'Male'),
          ageGroup,
          teamName,
          coachName: coachName || '',
          coachContact: coachContact || '',
        };
        submissionData['34'] = JSON.stringify(subTeamObj);
        if (birthCertificate) {
          submissionData['43'] = birthCertificate;
        }

        await query(
          `UPDATE form_submissions SET data = $1, updated_at = NOW() WHERE id = $2`,
          [JSON.stringify(submissionData), submissionId]
        );

        // Also update team_players sub_team label
        const subTeamLabel = `${teamName} (${subTeamObj.gender} - ${ageGroup})`;
        await query(
          `UPDATE team_players SET sub_team = $1 WHERE LOWER(player_email) = LOWER($2) AND player_name = $3`,
          [subTeamLabel, customerEmail, submissionData['6'] || playerName || '']
        );

        return res.status(200).json({ success: true, message: 'Age group updated. Your profile is under review.' });
      }

      if (action === 'complete_registration') {
        // Full data recovery — update DOB, age group, team assignment, birth certificate, and other missing fields
        if (!dob) return res.status(400).json({ error: 'Date of birth is required' });
        if (!ageGroup || !teamName) return res.status(400).json({ error: 'Age group and team are required' });

        // Update DOB
        submissionData['10'] = dob;

        // Build and set sub-team object
        const subTeamObj = {
          gender: gender || 'Male',
          ageGroup,
          teamName,
          coachName: coachName || '',
          coachContact: coachContact || '',
        };
        submissionData['34'] = JSON.stringify(subTeamObj);

        // Set birth certificate if provided
        if (birthCertificate) {
          submissionData['43'] = birthCertificate;
        }

        // Set player name if provided
        if (playerName) {
          submissionData['6'] = playerName;
        }

        // Set shirt/jersey number
        if (shirtNumber) {
          submissionData['36'] = shirtNumber;
        }

        // Set profile image
        if (profileImage) {
          submissionData['46'] = profileImage;
        }

        // Set parent phone
        if (parentPhone) {
          submissionData['40'] = parentPhone;
        }

        // Fix field 8 — set proper team UUID reference
        if (teamFormSubmissionUuid) {
          submissionData['8'] = teamFormSubmissionUuid;
        }

        // Set consent flag
        submissionData['44'] = 1;

        await query(
          `UPDATE form_submissions SET data = $1, updated_at = NOW() WHERE id = $2`,
          [JSON.stringify(submissionData), submissionId]
        );

        // Resolve team from uuid if provided
        let teamId = null;
        if (teamFormSubmissionUuid) {
          const teamResult = await query(
            `SELECT id FROM teams WHERE form_submission_uuid::text = $1 LIMIT 1`,
            [String(teamFormSubmissionUuid)]
          );
          if (teamResult.rows.length > 0) teamId = teamResult.rows[0].id;
        }

        // Update team_players record
        const subTeamLabel = `${teamName} (${subTeamObj.gender} - ${ageGroup})`;
        const plName = playerName || submissionData['6'] || '';
        
        // Update existing record — also update jersey_number and player_phone
        const updateResult = await query(
          `UPDATE team_players 
           SET sub_team = $1, team_id = COALESCE($2, team_id),
               jersey_number = COALESCE($5, jersey_number),
               player_phone = COALESCE($6, player_phone)
           WHERE LOWER(player_email) = LOWER($3) AND player_name = $4
           RETURNING id`,
          [subTeamLabel, teamId, customerEmail, plName, shirtNumber ? parseInt(shirtNumber) : null, parentPhone || null]
        );

        // If no record was updated (name mismatch from manual entry), try by email only
        if (updateResult.rows.length === 0) {
          await query(
            `UPDATE team_players 
             SET sub_team = $1, team_id = COALESCE($2, team_id), player_name = $3,
                 jersey_number = COALESCE($5, jersey_number),
                 player_phone = COALESCE($6, player_phone)
             WHERE LOWER(player_email) = LOWER($4)`,
            [subTeamLabel, teamId, plName, customerEmail, shirtNumber ? parseInt(shirtNumber) : null, parentPhone || null]
          );
        }

        return res.status(200).json({ success: true, message: 'Registration details updated successfully. Your profile is now under review.' });
      }

      return res.status(400).json({ error: 'Invalid action. Use correct_dob, correct_age_group, or complete_registration.' });
    } catch (error) {
      console.error('Age correction update error:', error);
      return res.status(500).json({ error: 'Failed to update player details' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
