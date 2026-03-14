// API endpoint to ensure team_players exist and are marked paid after recovery.
// Called by the recover-registration page.
// 1. Updates any existing pending team_players to 'paid'
// 2. Creates missing team_players from form_submissions that have no team_player yet
import { query } from '../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    // Check if there's a paid order for this email
    const orderResult = await query(
      `SELECT id, order_number, total_amount, payment_status, items 
       FROM orders 
       WHERE LOWER(customer_email) = LOWER($1) 
         AND payment_status = 'paid'
       ORDER BY created_at DESC 
       LIMIT 1`,
      [email]
    );

    if (orderResult.rows.length === 0) {
      return res.json({ success: true, message: 'No paid order found — payment status unchanged', created: 0, updated: 0 });
    }

    const order = orderResult.rows[0];

    // Step 1: Update any existing pending team_players to paid
    const updateResult = await query(
      `UPDATE team_players 
       SET payment_status = 'paid'
       WHERE LOWER(player_email) = LOWER($1) 
         AND (payment_status IS NULL OR payment_status = 'pending_payment')
       RETURNING id, player_name`,
      [email]
    );

    if (updateResult.rows.length > 0) {
      console.log(`Recovery: Updated ${updateResult.rows.length} team_players to paid for ${email}`);
    }

    // Step 2: Find form_submissions that have no corresponding team_player yet
    const submissions = await query(
      `SELECT fs.id, fs.data FROM form_submissions fs
       WHERE LOWER(fs.customer_email) = LOWER($1) AND fs.form_id = '2'
         AND NOT EXISTS (
           SELECT 1 FROM team_players tp
           WHERE tp.registration_data->>'formSubmissionId' = fs.id::text
         )`,
      [email]
    );

    const createdPlayers = [];

    for (const sub of submissions.rows) {
      const d = typeof sub.data === 'string' ? JSON.parse(sub.data) : (sub.data || {});
      const playerName = d['6'] || '';
      const parentEmail = d['38'] || d.checkout_email || email;
      const parentPhone = d['40'] || d.checkout_phone || '';
      const jerseyNumber = d['36'] || null;
      const jerseySize = d['25_shirtSize'] || '';

      if (!playerName) continue;

      // Resolve team from field 8 (team selection)
      let matchedTeam = null;
      const teamSel = d['8'] || null;
      if (teamSel) {
        const teamName = typeof teamSel === 'object' ? (teamSel.teamName || '') : '';
        const teamSubId = typeof teamSel === 'object' ? (teamSel.id || '') : String(teamSel);
        if (teamName) {
          const tr = await query('SELECT id, team_name FROM teams WHERE LOWER(team_name) = LOWER($1) LIMIT 1', [teamName]);
          matchedTeam = tr.rows[0] || null;
        }
        if (!matchedTeam && teamSubId) {
          const tr = await query('SELECT id, team_name FROM teams WHERE form_submission_uuid::text = $1 LIMIT 1', [String(teamSubId)]);
          matchedTeam = tr.rows[0] || null;
        }
      }

      if (!matchedTeam) {
        console.log(`Recovery: could not match team for player ${playerName} (submission ${sub.id})`);
        continue;
      }

      // Build sub_team label from field 34
      let subTeam = '';
      const subTeamVal = d['34'] || '';
      if (subTeamVal && typeof subTeamVal === 'object') {
        const name = (subTeamVal.teamName || '').trim();
        const gender = (subTeamVal.gender || '').trim();
        const age = (subTeamVal.ageGroup || '').trim();
        subTeam = (name && gender && age) ? `${name} (${gender} - ${age})` : (name && age) ? `${name} (${age})` : name || age || gender || '';
      } else if (typeof subTeamVal === 'string') {
        try {
          const p = JSON.parse(subTeamVal);
          const name = (p.teamName || '').trim();
          const gender = (p.gender || '').trim();
          const age = (p.ageGroup || '').trim();
          subTeam = (name && gender && age) ? `${name} (${gender} - ${age})` : (name && age) ? `${name} (${age})` : name || age || gender || '';
        } catch { subTeam = subTeamVal.trim(); }
      }

      // Dedup check: player name + email + team + sub_team
      const existingPlayer = await query(
        `SELECT id FROM team_players
         WHERE team_id = $1 AND LOWER(player_name) = LOWER($2)
           AND LOWER(COALESCE(player_email, '')) = LOWER($3)
           AND LOWER(COALESCE(sub_team, '')) = LOWER($4)
         LIMIT 1`,
        [matchedTeam.id, playerName, parentEmail, subTeam || '']
      );

      if (existingPlayer.rows.length > 0) {
        // Player exists — ensure it's marked paid
        await query(
          `UPDATE team_players SET payment_status = 'paid' WHERE id = $1 AND payment_status != 'paid'`,
          [existingPlayer.rows[0].id]
        );
        continue;
      }

      // Create team_player as 'paid'
      const regData = {
        formSubmissionId: sub.id,
        formId: '2',
        parentEmail,
        parentPhone,
        teamName: matchedTeam.team_name,
        subTeam,
        profileImage: d['46'] || null,
        recoveredRegistration: true
      };

      const insertResult = await query(
        `INSERT INTO team_players (team_id, sub_team, player_name, player_email, player_phone,
          jersey_size, jersey_number, registration_data, payment_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'paid')
         RETURNING id`,
        [matchedTeam.id, subTeam || null, playerName, parentEmail || null,
         parentPhone || null, jerseySize || null, jerseyNumber || null, JSON.stringify(regData)]
      );

      console.log(`Recovery: Created PAID team_player ${insertResult.rows[0].id} for ${playerName} in ${matchedTeam.team_name} (${subTeam})`);
      createdPlayers.push({ id: insertResult.rows[0].id, name: playerName, team: matchedTeam.team_name });

      // Record kit markup revenue
      try {
        const teamRow = await query('SELECT kit_pricing FROM teams WHERE id = $1', [matchedTeam.id]);
        const kitPricing = teamRow.rows[0]?.kit_pricing;
        if (kitPricing) {
          const pricing = typeof kitPricing === 'string' ? JSON.parse(kitPricing) : kitPricing;
          const markup = parseFloat(pricing.markup) || 0;
          if (markup > 0) {
            await query(
              `INSERT INTO team_revenue (team_id, revenue_type, amount, description, reference_id, payment_status)
               VALUES ($1, 'player-registration-markup', $2, $3, $4, 'paid')`,
              [matchedTeam.id, markup, `Kit markup for recovered player: ${playerName}`, String(sub.id)]
            );
            console.log(`Recovery: Recorded R${markup} markup revenue for ${playerName}, team ${matchedTeam.id}`);
          }
        }
      } catch (revErr) {
        console.log('Recovery: Could not record kit markup revenue:', revErr.message);
      }
    }

    return res.json({
      success: true,
      updated: updateResult.rows.length,
      created: createdPlayers.length,
      players: [
        ...updateResult.rows.map(r => r.player_name),
        ...createdPlayers.map(p => p.name)
      ],
      orderId: order.order_number
    });
  } catch (error) {
    console.error('Recovery payment update error:', error);
    return res.status(500).json({ error: error.message });
  }
}
