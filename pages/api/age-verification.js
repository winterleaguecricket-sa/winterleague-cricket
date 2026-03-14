// API to verify player DOB against age group cutoffs
// GET: Returns age verification results (optionally filtered by teamId)
// POST: Allows coach to confirm gender for a player (re-evaluates age check)
import { query } from '../../lib/db';

// Age group cutoffs: birth year must be >= cutoff year
const AGE_CUTOFFS = {
  'U9':  2017,
  'U11': 2015,
  'U13': 2013,
  'U15': 2011,
  'U17': 2009,
};

function verifyPlayer(row, currentYear, today) {
  const playerName = (row.player_name || 'Unknown').trim();
  const dob = row.dob || null;
  const ageGroup = (row.age_group || '').trim();
  const teamName = (row.team_name || 'Unknown').trim();
  const gender = (row.gender || '').trim();
  const isFemale = gender.toLowerCase() === 'female' || gender.toLowerCase() === 'girls';
  const parentName = (row.parent_name || '').trim();
  const email = row.customer_email || row.parent_email || '';
  const createdAt = row.created_at;

  let birthYear = null;
  let status = 'pass';
  let reason = '';

  if (!dob) {
    status = 'error';
    reason = 'No date of birth provided';
  } else {
    birthYear = parseInt(dob.substring(0, 4), 10);

    if (dob > today) {
      status = 'error';
      reason = `Future date of birth (${dob}) — likely data entry error`;
    } else if (birthYear > currentYear - 4) {
      status = 'error';
      reason = `Birth year ${birthYear} — player too young for any league`;
    } else if (birthYear < 1990) {
      status = 'error';
      reason = `Unusually old birth year (${birthYear})`;
    } else if (!ageGroup) {
      status = 'error';
      reason = 'No age group assigned';
    } else if (ageGroup === 'Senior') {
      status = 'pass';
      reason = 'Senior — no age restriction';
    } else {
      const baseCutoff = AGE_CUTOFFS[ageGroup];
      const cutoff = baseCutoff ? (isFemale ? baseCutoff - 2 : baseCutoff) : null;
      if (!baseCutoff) {
        status = 'error';
        reason = `Unknown age group: ${ageGroup}`;
      } else if (birthYear < cutoff) {
        status = 'fail';
        reason = `Born ${birthYear}, but ${ageGroup} requires ${cutoff}+${isFemale ? ' (female +2yr grace applied)' : ''} (too old by ${cutoff - birthYear} year${cutoff - birthYear > 1 ? 's' : ''})`;
      } else {
        status = 'pass';
        const nextGroup = getYoungerGroup(ageGroup);
        if (nextGroup && birthYear >= AGE_CUTOFFS[nextGroup]) {
          reason = `Born ${birthYear} — eligible but could play in ${nextGroup}`;
        }
      }
    }
  }

  return {
    id: row.id,
    teamPlayerId: row.team_player_id || null,
    playerName,
    dob,
    birthYear,
    ageGroup: ageGroup || 'N/A',
    teamName,
    gender: gender || null,
    parentName,
    email,
    status,
    reason,
    createdAt,
  };
}

export default async function handler(req, res) {
  // GET: Return age verification results
  if (req.method === 'GET') {
    const { teamId } = req.query;

    try {
      let result;

      if (teamId) {
        // Team-specific query: joins team_players → form_submissions for DOB
        result = await query(`
          SELECT DISTINCT ON (tp.id)
            tp.id as team_player_id,
            fs.id,
            tp.player_name,
            fs.data->>'10' as dob,
            tp.sub_team,
            tp.player_email as parent_email,
            fs.data->>'37' as parent_name,
            fs.customer_email
          FROM team_players tp
          LEFT JOIN form_submissions fs 
            ON fs.id::text = tp.registration_data->>'formSubmissionId'
            AND fs.form_id = '2'
          WHERE tp.team_id = $1 AND tp.payment_status = 'paid'
          ORDER BY tp.id
        `, [teamId]);

        // Parse age group and gender from sub_team field (e.g. "Royal Falcons (Male - U11)")
        const currentYear = new Date().getFullYear();
        const today = new Date().toISOString().slice(0, 10);

        const players = result.rows.map(row => {
          let ageGroup = '';
          let gender = '';
          let teamName = '';
          const subTeam = row.sub_team || '';
          const match = subTeam.match(/\((\w+)\s*-\s*(\w+)\)\s*$/);
          if (match) {
            gender = match[1]; // Male, Female, Mixed
            ageGroup = match[2]; // U9, U11, etc
            teamName = subTeam.replace(/\s*\(.*\)\s*$/, '').trim();
          }

          return verifyPlayer({
            ...row,
            age_group: ageGroup,
            team_name: teamName,
            gender: gender,
          }, currentYear, today);
        });

        const total = players.length;
        const passed = players.filter(p => p.status === 'pass').length;
        const failed = players.filter(p => p.status === 'fail').length;
        const errors = players.filter(p => p.status === 'error').length;

        return res.status(200).json({
          players,
          summary: { total, passed, failed, errors },
          cutoffs: AGE_CUTOFFS,
        });
      }

      // Default: all PAID players (admin view)
      result = await query(`
        SELECT DISTINCT ON (fs.id)
          fs.id,
          fs.data->>'6' as player_name,
          fs.data->>'10' as dob,
          CASE 
            WHEN fs.data->>'34' IS NOT NULL AND fs.data->>'34' != '' 
            THEN (fs.data->>'34')::jsonb->>'ageGroup'
            ELSE NULL
          END as age_group,
          CASE 
            WHEN fs.data->>'34' IS NOT NULL AND fs.data->>'34' != '' 
            THEN (fs.data->>'34')::jsonb->>'teamName'
            ELSE NULL
          END as team_name,
          CASE 
            WHEN fs.data->>'34' IS NOT NULL AND fs.data->>'34' != '' 
            THEN (fs.data->>'34')::jsonb->>'gender'
            ELSE NULL
          END as gender,
          fs.data->>'37' as parent_name,
          fs.customer_email,
          fs.created_at
        FROM form_submissions fs
        INNER JOIN orders o ON LOWER(o.customer_email) = LOWER(fs.customer_email)
          AND o.payment_status = 'paid'
        WHERE fs.form_id = '2'
        ORDER BY fs.id, fs.created_at DESC
      `);

      const currentYear = new Date().getFullYear();
      const today = new Date().toISOString().slice(0, 10);
      const players = result.rows.map(row => verifyPlayer(row, currentYear, today));

      const total = players.length;
      const passed = players.filter(p => p.status === 'pass').length;
      const failed = players.filter(p => p.status === 'fail').length;
      const errors = players.filter(p => p.status === 'error').length;

      return res.status(200).json({
        players,
        summary: { total, passed, failed, errors },
        cutoffs: AGE_CUTOFFS,
      });
    } catch (error) {
      console.error('Age verification error:', error);
      return res.status(500).json({ error: 'Failed to run age verification' });
    }
  }

  // POST: Coach confirms gender for a player
  if (req.method === 'POST') {
    const { action } = req.body;

    if (action === 'confirm-gender') {
      const { teamPlayerId, gender, teamId } = req.body;
      if (!teamPlayerId || !gender || !teamId) {
        return res.status(400).json({ error: 'teamPlayerId, gender, and teamId required' });
      }

      const validGenders = ['Male', 'Female'];
      if (!validGenders.includes(gender)) {
        return res.status(400).json({ error: 'Gender must be Male or Female' });
      }

      try {
        // Verify the player belongs to this team
        const playerResult = await query(
          'SELECT id, sub_team, player_name FROM team_players WHERE id = $1 AND team_id = $2',
          [teamPlayerId, teamId]
        );
        if (!playerResult.rows[0]) {
          return res.status(404).json({ error: 'Player not found in this team' });
        }

        const player = playerResult.rows[0];
        const oldSubTeam = player.sub_team || '';

        // Update the gender in sub_team field: "Team Name (Male - U13)" → "Team Name (Female - U13)"
        let newSubTeam = oldSubTeam;
        const subMatch = oldSubTeam.match(/^(.+)\((\w+)\s*-\s*(\w+)\)$/);
        if (subMatch) {
          newSubTeam = `${subMatch[1]}(${gender} - ${subMatch[3]})`;
        }

        await query(
          'UPDATE team_players SET sub_team = $1 WHERE id = $2',
          [newSubTeam, teamPlayerId]
        );

        // Also update the gender in form_submissions field 34 if linked
        const regDataResult = await query(
          "SELECT registration_data->>'formSubmissionId' as fs_id FROM team_players WHERE id = $1",
          [teamPlayerId]
        );
        const fsId = regDataResult.rows[0]?.fs_id;
        if (fsId) {
          const fsResult = await query("SELECT data->>'34' as sub_team_json FROM form_submissions WHERE id = $1", [fsId]);
          const rawJson = fsResult.rows[0]?.sub_team_json;
          if (rawJson) {
            try {
              const parsed = JSON.parse(rawJson);
              parsed.gender = gender;
              await query(
                "UPDATE form_submissions SET data = jsonb_set(data, '{34}', $1::jsonb) WHERE id = $2",
                [JSON.stringify(parsed), fsId]
              );
            } catch {}
          }
        }

        return res.status(200).json({
          message: `Gender updated to ${gender} for ${player.player_name}`,
          newSubTeam,
        });
      } catch (error) {
        console.error('Gender confirm error:', error);
        return res.status(500).json({ error: 'Failed to update gender' });
      }
    }

    return res.status(400).json({ error: 'Unknown action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

function getYoungerGroup(ageGroup) {
  const order = ['U17', 'U15', 'U13', 'U11', 'U9'];
  const idx = order.indexOf(ageGroup);
  if (idx >= 0 && idx < order.length - 1) {
    return order[idx + 1];
  }
  return null;
}
