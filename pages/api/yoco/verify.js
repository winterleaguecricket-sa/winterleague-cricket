// Yoco payment verification endpoint
// Called by the success page after Yoco redirects back to confirm payment
// SECURITY: Only marks orders as paid if Yoco API explicitly confirms payment
import { query } from '../../../lib/db';
import { getYocoConfig } from './config';
import { sendParentPaymentSuccessEmail } from '../../../lib/parentEmailHelper';
import { logPaymentEvent, logApiError } from '../../../lib/logger';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orderId } = req.body;

  if (!orderId) {
    return res.status(400).json({ success: false, error: 'Order ID is required' });
  }

  // Basic input validation — order IDs follow pattern ORD{timestamp} or ORD_ADDON_{timestamp}
  if (typeof orderId !== 'string' || orderId.length > 50 || !/^ORD[\w]*\d+$/.test(orderId)) {
    return res.status(400).json({ success: false, error: 'Invalid order ID format' });
  }

  try {
    // 1. Look up order in database
    const orderResult = await query(
      'SELECT id, order_number, total_amount, status, payment_status, payment_method, gateway_checkout_id, customer_email, customer_name, order_type FROM orders WHERE order_number = $1',
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      console.warn(`Yoco verify: order ${orderId} not found in database`);
      logPaymentEvent({ orderId, email: null, amount: null, gateway: 'yoco', status: 'verify_order_not_found', details: 'Order not found in database during verification' });
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // If already confirmed, return success immediately
    if (order.payment_status === 'paid') {
      return res.status(200).json({
        success: true,
        status: 'paid',
        message: 'Payment already confirmed'
      });
    }

    // SECURITY: We MUST have a gateway_checkout_id to verify with Yoco API
    // Without it, we cannot confirm payment — refuse to mark as paid
    if (!order.gateway_checkout_id) {
      console.warn(`Yoco verify: order ${orderId} has no gateway_checkout_id — cannot verify`);
      logPaymentEvent({ orderId, email: order.customer_email, amount: order.total_amount, gateway: 'yoco', status: 'verify_no_checkout_id', details: 'Order has no gateway_checkout_id — cannot verify with Yoco API' });
      return res.status(200).json({
        success: true,
        status: 'pending',
        message: 'Payment is being processed. Please allow a few minutes for confirmation.'
      });
    }

    // 2. Verify with Yoco API using the checkout ID
    const config = await getYocoConfig();

    if (!config.secretKey) {
      console.error('Yoco verify: no secret key configured — cannot verify payment');
      logPaymentEvent({ orderId, email: order.customer_email, amount: order.total_amount, gateway: 'yoco', status: 'verify_config_error', details: 'No Yoco secret key configured' });
      return res.status(200).json({
        success: true,
        status: 'pending',
        message: 'Payment is being processed. Please allow a few minutes for confirmation.'
      });
    }

    try {
      const yocoRes = await fetch(`https://payments.yoco.com/api/checkouts/${order.gateway_checkout_id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.secretKey}`
        }
      });

      if (yocoRes.ok) {
        const checkoutData = await yocoRes.json();
        console.log(`Yoco checkout ${order.gateway_checkout_id} status: ${checkoutData.status}`);

        if (checkoutData.status === 'completed') {
          // SECURITY: Verify amount matches before marking as paid
          const expectedCents = Math.round(parseFloat(order.total_amount) * 100);
          const yocoAmountCents = checkoutData.amount;
          
          if (yocoAmountCents && expectedCents !== yocoAmountCents) {
            console.error(`SECURITY: Amount mismatch for order ${orderId}: DB expects ${expectedCents} cents, Yoco reports ${yocoAmountCents} cents`);
            logPaymentEvent({ orderId, email: order.customer_email, amount: order.total_amount, gateway: 'yoco', status: 'verify_amount_mismatch', details: `SECURITY: DB expects ${expectedCents} cents, Yoco reports ${yocoAmountCents} cents` });
            logApiError({ method: 'POST', url: '/api/yoco/verify', statusCode: 200, error: `Amount mismatch: expected ${expectedCents}, got ${yocoAmountCents}`, body: { orderId } });
            return res.status(200).json({
              success: true,
              status: 'pending',
              message: 'Payment verification in progress. Please contact support if this persists.'
            });
          }

          // Payment confirmed by Yoco API — update order
          await query(
            `UPDATE orders SET 
              payment_status = 'paid',
              status = 'confirmed',
              payment_method = 'yoco',
              status_notes = $1,
              status_history = COALESCE(status_history, '[]'::jsonb) || $2::jsonb,
              updated_at = NOW()
            WHERE order_number = $3 AND payment_status != 'paid'`,
            [
              `Payment verified via Yoco API at ${new Date().toISOString()}`,
              JSON.stringify([{
                status: 'confirmed',
                payment_status: 'paid',
                timestamp: new Date().toISOString(),
                note: `Yoco checkout ${order.gateway_checkout_id} verified as completed (${yocoAmountCents} cents)`
              }]),
              orderId
            ]
          );

          console.log(`Order ${orderId} marked as PAID via Yoco API verification`);

          logPaymentEvent({ orderId, email: order.customer_email, amount: order.total_amount, gateway: 'yoco', status: 'paid', details: `Verified via Yoco API. Checkout ${order.gateway_checkout_id} completed (${yocoAmountCents} cents)` });

          // Addon orders now stand alone — no merged items to clean up in original orders

          // ===== CREATE TEAM PLAYERS + REVENUE FROM FORM SUBMISSIONS =====
          // Players are no longer created at form submission time (to avoid pending clutter).
          // They are created HERE, directly as 'paid', after payment is confirmed.
          // Also handles legacy pending_payment records from before this change.
          try {
            // 1. Update any legacy pending_payment players to paid
            const legacyUpdate = await query(
              `UPDATE team_players SET payment_status = 'paid'
               WHERE payment_status = 'pending_payment'
                 AND LOWER(player_email) = LOWER($1)`,
              [order.customer_email]
            );
            if (legacyUpdate.rowCount > 0) {
              console.log(`Yoco verify: marked ${legacyUpdate.rowCount} legacy player(s) as paid for ${order.customer_email}`);
            }

            // 2. Update any legacy pending_payment revenue to paid
            const legacyRevUpdate = await query(
              `UPDATE team_revenue tr SET payment_status = 'paid'
               FROM team_players tp
               WHERE tp.team_id = tr.team_id
                 AND tp.registration_data->>'formSubmissionId' = tr.reference_id
                 AND LOWER(tp.player_email) = LOWER($1)
                 AND tr.payment_status = 'pending_payment'`,
              [order.customer_email]
            );
            if (legacyRevUpdate.rowCount > 0) {
              console.log(`Yoco verify: marked ${legacyRevUpdate.rowCount} legacy revenue entry(s) as paid for ${order.customer_email}`);
            }

            // 3. Create new team_players + team_revenue from form submissions that don't have players yet
            const submissions = await query(
              `SELECT fs.id, fs.data FROM form_submissions fs
               WHERE LOWER(fs.customer_email) = LOWER($1) AND fs.form_id = '2'
                 AND NOT EXISTS (
                   SELECT 1 FROM team_players tp
                   WHERE tp.registration_data->>'formSubmissionId' = fs.id::text
                 )`,
              [order.customer_email]
            );

            for (const sub of submissions.rows) {
              const d = typeof sub.data === 'string' ? JSON.parse(sub.data) : (sub.data || {});
              const playerName = d['6'] || '';
              const parentEmail = d['38'] || d.checkout_email || order.customer_email || '';
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
                console.log(`Yoco verify: could not match team for player ${playerName} (submission ${sub.id})`);
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
                try { const p = JSON.parse(subTeamVal); subTeam = (p.teamName && p.gender && p.ageGroup) ? `${p.teamName} (${p.gender} - ${p.ageGroup})` : p.teamName || ''; } catch { subTeam = subTeamVal.trim(); }
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
                console.log(`Yoco verify: player ${playerName} already exists in team ${matchedTeam.id} — skipping`);
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
              console.log(`Yoco verify: created PAID player ${playerName} in team ${matchedTeam.team_name}`);

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
                    console.log(`Yoco verify: recorded R${markup} markup revenue for ${playerName}, team ${matchedTeam.id}`);
                  }
                }
              } catch (revErr) {
                console.error(`Yoco verify: revenue recording error for ${playerName}:`, revErr.message);
              }

              // Record new player for CricClubs upload
              try {
                const existingProfile = d.existingCricClubsProfile || null;
                if (!existingProfile) {
                  const host = req.headers.host || '';
                  const protocol = req.headers['x-forwarded-proto'] || 'http';
                  const baseUrl = host ? `${protocol}://${host}` : 'https://winterleaguecricket.co.za';
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
                console.log('Yoco verify: could not record new player for CricClubs:', npErr.message);
              }

              // Create/update customer profile
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
                console.log('Yoco verify: customer profile error:', custErr.message);
              }
            }

            if (submissions.rows.length > 0) {
              console.log(`Yoco verify: processed ${submissions.rows.length} form submission(s) for ${order.customer_email}`);
            }
          } catch (playerErr) {
            console.error('Yoco verify: error creating team players from submissions:', playerErr.message);
          }

          // Send parent payment success email (non-blocking)
          try {
            await sendParentPaymentSuccessEmail(
              orderId,
              order.customer_email || '',
              order.customer_name || '',
              order.total_amount
            );
          } catch (emailErr) {
            console.error('Parent payment email error (non-blocking):', emailErr.message);
          }

          return res.status(200).json({
            success: true,
            status: 'paid',
            message: 'Payment verified and confirmed'
          });
        } else {
          console.log(`Yoco checkout status is "${checkoutData.status}" — not yet completed`);
          return res.status(200).json({
            success: true,
            status: checkoutData.status,
            message: `Checkout status: ${checkoutData.status}`
          });
        }
      } else {
        const errorText = await yocoRes.text().catch(() => 'unknown');
        console.warn(`Yoco API returned ${yocoRes.status} for checkout ${order.gateway_checkout_id}: ${errorText}`);
      }
    } catch (apiErr) {
      console.error('Yoco API verification error:', apiErr.message);
      logApiError({ method: 'POST', url: '/api/yoco/verify', statusCode: 500, error: apiErr, body: { orderId, checkoutId: order.gateway_checkout_id } });
      logPaymentEvent({ orderId, email: order.customer_email, amount: order.total_amount, gateway: 'yoco', status: 'verify_api_error', details: `Yoco API error: ${apiErr.message}` });
    }

    // 3. If Yoco API call failed, do NOT mark as paid — return pending
    // SECURITY: Never trust the success redirect alone as proof of payment
    console.log(`Yoco verify: API check inconclusive for order ${orderId} — returning pending status`);
    logPaymentEvent({ orderId, email: order.customer_email, amount: order.total_amount, gateway: 'yoco', status: 'verify_inconclusive', details: 'Yoco API call did not return completed status — order remains pending' });
    return res.status(200).json({
      success: true,
      status: 'pending',
      message: 'Payment is being processed. Please allow a few minutes for confirmation.'
    });

  } catch (error) {
    console.error('Yoco verify error:', error);
    logApiError({ method: 'POST', url: '/api/yoco/verify', statusCode: 500, error, body: { orderId } });
    logPaymentEvent({ orderId, email: null, amount: null, gateway: 'yoco', status: 'verify_exception', details: error.message });
    return res.status(500).json({ success: false, error: 'Verification failed' });
  }
}
