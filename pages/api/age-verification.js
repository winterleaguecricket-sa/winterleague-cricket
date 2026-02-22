// API to verify player DOB against age group cutoffs
import { query } from '../../lib/db';

// Age group cutoffs: birth year must be >= cutoff year
const AGE_CUTOFFS = {
  'U9':  2017,
  'U11': 2015,
  'U13': 2013,
  'U15': 2011,
  'U17': 2009,
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get all player registration submissions (form_id = 2)
    const result = await query(`
      SELECT 
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
        fs.data->>'37' as parent_name,
        fs.customer_email,
        fs.created_at
      FROM form_submissions fs
      WHERE fs.form_id = '2'
      ORDER BY fs.created_at DESC
    `);

    const currentYear = new Date().getFullYear();
    const players = result.rows.map(row => {
      const playerName = (row.player_name || 'Unknown').trim();
      const dob = row.dob || null;
      const ageGroup = (row.age_group || '').trim();
      const teamName = (row.team_name || 'Unknown').trim();
      const parentName = (row.parent_name || '').trim();
      const email = row.customer_email || '';
      const createdAt = row.created_at;

      let birthYear = null;
      let status = 'pass';
      let reason = '';

      if (!dob) {
        status = 'error';
        reason = 'No date of birth provided';
      } else {
        birthYear = parseInt(dob.substring(0, 4), 10);

        // Check for future/invalid birth dates
        if (birthYear > currentYear) {
          status = 'error';
          reason = `Future birth year (${birthYear}) — likely data entry error`;
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
          const cutoff = AGE_CUTOFFS[ageGroup];
          if (!cutoff) {
            status = 'error';
            reason = `Unknown age group: ${ageGroup}`;
          } else if (birthYear < cutoff) {
            status = 'fail';
            reason = `Born ${birthYear}, but ${ageGroup} requires ${cutoff}+ (too old by ${cutoff - birthYear} year${cutoff - birthYear > 1 ? 's' : ''})`;
          } else {
            status = 'pass';
            // Check if player is significantly younger than their group
            const nextGroup = getYoungerGroup(ageGroup);
            if (nextGroup && birthYear >= AGE_CUTOFFS[nextGroup]) {
              reason = `Born ${birthYear} — eligible but could play in ${nextGroup}`;
            }
          }
        }
      }

      return {
        id: row.id,
        playerName,
        dob,
        birthYear,
        ageGroup: ageGroup || 'N/A',
        teamName,
        parentName,
        email,
        status,
        reason,
        createdAt,
      };
    });

    // Summary stats
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

function getYoungerGroup(ageGroup) {
  const order = ['U17', 'U15', 'U13', 'U11', 'U9'];
  const idx = order.indexOf(ageGroup);
  if (idx >= 0 && idx < order.length - 1) {
    return order[idx + 1];
  }
  return null;
}
