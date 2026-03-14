// Competition API — returns teams competing per age group
// GET: ?ageGroup=U11 | ?teamId=25 | ?email=parent@email.com | ?all=true
// PUT: Update cup_wins / is_new_team for admin
import { query } from '../../lib/db';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { ageGroup, teamId, email, all } = req.query;

      // Helper: get all completed teams with their age group sub-teams and player counts
      const getCompetitionTeams = async (filterAgeGroup) => {
        // Get all completed teams with competition metadata
        const teamsResult = await query(`
          SELECT id, team_name, team_logo, shirt_design, primary_color, secondary_color,
                 age_group_teams, cup_wins, is_new_team, submission_data
          FROM teams
          WHERE status = 'completed'
          ORDER BY team_name
        `);

        // Get player counts per team per age group
        const playerCountsResult = await query(`
          SELECT team_id,
            CASE
              WHEN sub_team LIKE '%U9%' THEN 'U9'
              WHEN sub_team LIKE '%U11%' THEN 'U11'
              WHEN sub_team LIKE '%U13%' THEN 'U13'
              WHEN sub_team LIKE '%U15%' THEN 'U15'
              WHEN sub_team LIKE '%U17%' THEN 'U17'
              WHEN sub_team LIKE '%Senior%' THEN 'Senior'
              ELSE 'Other'
            END as age_group,
            count(*) as player_count
          FROM team_players
          WHERE team_id IS NOT NULL
          GROUP BY team_id, 
            CASE
              WHEN sub_team LIKE '%U9%' THEN 'U9'
              WHEN sub_team LIKE '%U11%' THEN 'U11'
              WHEN sub_team LIKE '%U13%' THEN 'U13'
              WHEN sub_team LIKE '%U15%' THEN 'U15'
              WHEN sub_team LIKE '%U17%' THEN 'U17'
              WHEN sub_team LIKE '%Senior%' THEN 'Senior'
              ELSE 'Other'
            END
        `);

        // Build player count lookup: { teamId: { ageGroup: count } }
        const playerCounts = {};
        for (const row of playerCountsResult.rows) {
          if (!playerCounts[row.team_id]) playerCounts[row.team_id] = {};
          playerCounts[row.team_id][row.age_group] = parseInt(row.player_count);
        }

        // Build competition data: one entry per team per age group they registered for
        const competition = [];
        for (const team of teamsResult.rows) {
          let ageGroupTeams = [];
          try {
            ageGroupTeams = typeof team.age_group_teams === 'string'
              ? JSON.parse(team.age_group_teams)
              : (team.age_group_teams || []);
          } catch (e) {
            ageGroupTeams = [];
          }

          // Get unique age groups this team registered for
          const registeredAgeGroups = [...new Set(ageGroupTeams.map(ag => ag.ageGroup))];

          for (const ag of registeredAgeGroups) {
            if (filterAgeGroup && ag !== filterAgeGroup) continue;

            competition.push({
              teamId: team.id,
              teamName: (team.team_name || '').trim(),
              ageGroup: ag,
              teamLogo: team.team_logo || null,
              shirtDesign: (() => {
                // Use admin-uploaded final kit image from submission_data
                let sd = team.submission_data;
                if (typeof sd === 'string') { try { sd = JSON.parse(sd); } catch(e) { sd = {}; } }
                return (sd && sd.kitDesignImageUrl) || null;
              })(),
              primaryColor: team.primary_color || null,
              secondaryColor: team.secondary_color || null,
              playerCount: (playerCounts[team.id] && playerCounts[team.id][ag]) || 0,
              cupWins: team.cup_wins || 0,
              isNewTeam: team.is_new_team || false,
            });
          }
        }

        return competition;
      };

      // GET ?ageGroup=U11 — all teams in a specific age group
      if (ageGroup) {
        const teams = await getCompetitionTeams(ageGroup);
        return res.status(200).json({ ageGroup, teams, totalTeams: teams.length });
      }

      // GET ?teamId=25 — all age groups that a specific team competes in, plus competitors
      if (teamId) {
        const allTeams = await getCompetitionTeams(null);
        
        // Find this team's age groups
        const myTeam = await query(`SELECT id, team_name, age_group_teams FROM teams WHERE id = $1`, [teamId]);
        if (myTeam.rows.length === 0) {
          return res.status(404).json({ error: 'Team not found' });
        }

        let ageGroupTeams = [];
        try {
          ageGroupTeams = typeof myTeam.rows[0].age_group_teams === 'string'
            ? JSON.parse(myTeam.rows[0].age_group_teams)
            : (myTeam.rows[0].age_group_teams || []);
        } catch (e) {
          ageGroupTeams = [];
        }

        const myAgeGroups = [...new Set(ageGroupTeams.map(ag => ag.ageGroup))].sort();

        // Build per-age-group competition view
        const competition = {};
        for (const ag of myAgeGroups) {
          const teamsInAg = allTeams.filter(t => t.ageGroup === ag);
          competition[ag] = {
            teams: teamsInAg,
            totalTeams: teamsInAg.length
          };
        }

        return res.status(200).json({
          teamId: parseInt(teamId),
          teamName: (myTeam.rows[0].team_name || '').trim(),
          ageGroups: myAgeGroups,
          competition
        });
      }

      // GET ?email=parent@email.com — age groups of parent's children, plus competitors
      if (email) {
        const allTeams = await getCompetitionTeams(null);

        // Get parent's players
        const playersResult = await query(`
          SELECT tp.id, tp.player_name, tp.team_id, tp.sub_team, t.team_name
          FROM team_players tp
          LEFT JOIN teams t ON t.id = tp.team_id
          WHERE LOWER(tp.player_email) = LOWER($1)
            AND tp.team_id IS NOT NULL
          ORDER BY tp.player_name
        `, [email.trim()]);

        const players = playersResult.rows.map(row => {
          // Extract age group from sub_team string
          const subTeam = row.sub_team || '';
          let ageGroup = '';
          const ageMatch = subTeam.match(/U\d+|Senior/);
          if (ageMatch) ageGroup = ageMatch[0];
          return {
            playerId: row.id,
            playerName: row.player_name,
            teamId: row.team_id,
            teamName: (row.team_name || '').trim(),
            subTeam: subTeam,
            ageGroup
          };
        }).filter(p => p.ageGroup); // Only players with a valid age group

        // Build per-player age group competition
        const playerCompetition = players.map(p => {
          const teamsInAg = allTeams.filter(t => t.ageGroup === p.ageGroup);
          return {
            ...p,
            competition: {
              teams: teamsInAg,
              totalTeams: teamsInAg.length
            }
          };
        });

        return res.status(200).json({ players: playerCompetition });
      }

      // GET ?all=true — summary of all age groups
      if (all === 'true') {
        const allTeams = await getCompetitionTeams(null);
        const ageGroups = {};
        for (const t of allTeams) {
          if (!ageGroups[t.ageGroup]) ageGroups[t.ageGroup] = { teams: [], totalTeams: 0 };
          ageGroups[t.ageGroup].teams.push(t);
          ageGroups[t.ageGroup].totalTeams++;
        }
        return res.status(200).json({ ageGroups });
      }

      return res.status(400).json({ error: 'Provide ageGroup, teamId, email, or all=true' });

    } catch (error) {
      console.error('Competition API GET error:', error);
      return res.status(500).json({ error: 'Failed to fetch competition data', details: error.message });
    }
  }

  // PUT — admin update cup_wins / is_new_team
  if (req.method === 'PUT') {
    try {
      const { teamId, cupWins, isNewTeam } = req.body;
      if (!teamId) return res.status(400).json({ error: 'teamId is required' });

      const updates = [];
      const values = [];
      let idx = 1;

      if (cupWins !== undefined) {
        updates.push(`cup_wins = $${idx++}`);
        values.push(parseInt(cupWins) || 0);
      }
      if (isNewTeam !== undefined) {
        updates.push(`is_new_team = $${idx++}`);
        values.push(!!isNewTeam);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'Provide cupWins or isNewTeam to update' });
      }

      values.push(teamId);
      const result = await query(
        `UPDATE teams SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, team_name, cup_wins, is_new_team`,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Team not found' });
      }

      return res.status(200).json({ team: result.rows[0] });
    } catch (error) {
      console.error('Competition API PUT error:', error);
      return res.status(500).json({ error: 'Failed to update team', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
