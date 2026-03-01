// Shared helper: Create team_players + team_revenue + link customer from form submissions
// Called after payment is confirmed (by verify.js, webhook.js, or reconcile-payments.js)
//
// IMPORTANT: This function is IDEMPOTENT — safe to call multiple times.
// It checks for existing team_player records before creating new ones.
// All errors are caught internally and logged — will never crash the caller.

import { query } from './db';

/**
 * Creates team_player records from form_submissions for a paid customer.
 * Also creates team_revenue entries for kit markups and links the customer to their team.
 *
 * @param {string} customerEmail - The customer's email address
 * @param {string} callerLabel - Label for log messages (e.g. 'Yoco verify', 'Reconcile', 'Webhook')
 * @param {object} [options] - Optional settings
 * @param {string} [options.baseUrl] - Base URL for new-players API call (defaults to https://winterleaguecricket.co.za)
 * @returns {object} - { playersCreated: number, errors: string[] }
 */
export async function createTeamPlayersFromSubmissions(customerEmail, callerLabel, options = {}) {
  const result = { playersCreated: 0, errors: [] };

  if (!customerEmail) {
    return result;
  }

  try {
    // 1. Update any legacy pending_payment players to paid
    const legacyUpdate = await query(
      `UPDATE team_players SET payment_status = 'paid'
       WHERE payment_status = 'pending_payment'
         AND LOWER(player_email) = LOWER($1)`,
      [customerEmail]
    );
    if (legacyUpdate.rowCount > 0) {
      console.log(`[${callerLabel}] marked ${legacyUpdate.rowCount} legacy player(s) as paid for ${customerEmail}`);
    }

    // 2. Update any legacy pending_payment revenue to paid
    const legacyRevUpdate = await query(
      `UPDATE team_revenue tr SET payment_status = 'paid'
       FROM team_players tp
       WHERE tp.team_id = tr.team_id
         AND tp.registration_data->>'formSubmissionId' = tr.reference_id
         AND LOWER(tp.player_email) = LOWER($1)
         AND tr.payment_status = 'pending_payment'`,
      [customerEmail]
    );
    if (legacyRevUpdate.rowCount > 0) {
      console.log(`[${callerLabel}] marked ${legacyRevUpdate.rowCount} legacy revenue entry(s) as paid for ${customerEmail}`);
    }

    // 3. Create new team_players + team_revenue from form submissions that don't have players yet
    const submissions = await query(
      `SELECT fs.id, fs.data FROM form_submissions fs
       WHERE LOWER(fs.customer_email) = LOWER($1) AND fs.form_id = '2'
         AND NOT EXISTS (
           SELECT 1 FROM team_players tp
           WHERE tp.registration_data->>'formSubmissionId' = fs.id::text
         )`,
      [customerEmail]
    );

    for (const sub of submissions.rows) {
      try {
        const d = typeof sub.data === 'string' ? JSON.parse(sub.data) : (sub.data || {});
        const playerName = d['6'] || '';
        const parentEmail = d['38'] || d.checkout_email || customerEmail || '';
        const parentPhone = d['40'] || d.checkout_phone || '';
        const parentName = d['37'] || '';
        const jerseyNumber = d['36'] || null;
        const jerseySize = d['25_shirtSize'] || '';

        if (!playerName) continue;

        // Resolve team from field 8 (team selection dropdown)
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
          console.log(`[${callerLabel}] could not match team for player ${playerName} (submission ${sub.id})`);
          result.errors.push(`No team match for ${playerName}`);
          continue;
        }

        // Build sub_team label
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

        // Dedup: check player doesn't already exist by name+email+team+sub_team
        const existingPlayer = await query(
          `SELECT id FROM team_players
           WHERE team_id = $1 AND LOWER(player_name) = LOWER($2)
             AND LOWER(COALESCE(player_email, '')) = LOWER($3)
             AND LOWER(COALESCE(sub_team, '')) = LOWER($4)
           LIMIT 1`,
          [matchedTeam.id, playerName, parentEmail, subTeam || '']
        );

        if (existingPlayer.rows.length > 0) {
          console.log(`[${callerLabel}] player ${playerName} already exists in team ${matchedTeam.id} — skipping`);
          continue;
        }

        // Create team_player directly as 'paid'
        const regData = {
          formSubmissionId: sub.id,
          formId: '2',
          parentEmail,
          parentPhone,
          teamName: matchedTeam.team_name,
          subTeam,
          profileImage: d['46'] || null
        };

        await query(
          `INSERT INTO team_players (team_id, sub_team, player_name, player_email, player_phone,
            jersey_size, jersey_number, registration_data, payment_status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'paid')`,
          [matchedTeam.id, subTeam || null, playerName, parentEmail || null,
           parentPhone || null, jerseySize || null, jerseyNumber || null, JSON.stringify(regData)]
        );
        console.log(`[${callerLabel}] created PAID player ${playerName} in team ${matchedTeam.team_name}`);
        result.playersCreated++;

        // Create team_revenue 'paid' for kit markup
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
                [matchedTeam.id, markup, `Kit markup for player: ${playerName}`, String(sub.id)]
              );
              console.log(`[${callerLabel}] recorded R${markup} markup revenue for ${playerName}, team ${matchedTeam.id}`);
            }
          }
        } catch (revErr) {
          console.error(`[${callerLabel}] revenue recording error for ${playerName}:`, revErr.message);
          result.errors.push(`Revenue error for ${playerName}: ${revErr.message}`);
        }

        // Record new player for CricClubs upload (non-blocking, best-effort)
        try {
          const existingProfile = d.existingCricClubsProfile || null;
          if (!existingProfile) {
            const baseUrl = options.baseUrl || 'https://winterleaguecricket.co.za';
            await fetch(`${baseUrl}/api/new-players`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                playerName, email: parentEmail, team: matchedTeam.team_name,
                dob: d['10'] || '', submissionId: sub.id
              })
            });
          }
        } catch (npErr) {
          console.log(`[${callerLabel}] could not record new player for CricClubs:`, npErr.message);
        }

        // Create/update customer profile (set team_id)
        try {
          const existingCust = await query('SELECT id, team_id FROM customers WHERE LOWER(email) = LOWER($1) LIMIT 1', [parentEmail]);
          if (existingCust.rows.length === 0) {
            const parts = String(parentName || '').trim().split(/\s+/).filter(Boolean);
            const firstName = parts.shift() || '';
            const lastName = parts.join(' ') || '';
            const pwd = d['39'] || d.checkout_password || '';
            await query(
              `INSERT INTO customers (email, password_hash, first_name, last_name, phone, country)
               VALUES ($1, $2, $3, $4, $5, 'South Africa') ON CONFLICT (email) DO NOTHING`,
              [parentEmail, pwd, firstName, lastName, parentPhone]
            );
          } else if (!existingCust.rows[0].team_id) {
            await query('UPDATE customers SET team_id = $1, updated_at = NOW() WHERE id = $2', [matchedTeam.id, existingCust.rows[0].id]);
          }
        } catch (custErr) {
          console.log(`[${callerLabel}] customer profile error:`, custErr.message);
          result.errors.push(`Customer update error: ${custErr.message}`);
        }
      } catch (subErr) {
        console.error(`[${callerLabel}] error processing submission ${sub.id}:`, subErr.message);
        result.errors.push(`Submission ${sub.id}: ${subErr.message}`);
      }
    }

    if (submissions.rows.length > 0) {
      console.log(`[${callerLabel}] processed ${submissions.rows.length} form submission(s) for ${customerEmail}, created ${result.playersCreated} player(s)`);
    }
  } catch (err) {
    console.error(`[${callerLabel}] error in createTeamPlayersFromSubmissions for ${customerEmail}:`, err.message);
    result.errors.push(`Top-level error: ${err.message}`);
  }

  return result;
}
