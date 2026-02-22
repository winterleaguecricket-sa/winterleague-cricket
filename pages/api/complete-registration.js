// API endpoint for completing incomplete registrations
// For users who paid but whose form_submission/team_player records were lost
import { query } from '../../lib/db';
import { getYocoConfig } from './yoco/config';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Allow large payloads for image uploads
    },
  },
};

export default async function handler(req, res) {
  // GET: Check if logged-in user has an incomplete registration
  if (req.method === 'GET') {
    try {
      const { email } = req.query;
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      // Check if user has a paid order but no form_submission for form_id=2
      const orderResult = await query(
        `SELECT order_number, customer_name, customer_phone, total_amount, items, created_at
         FROM orders 
         WHERE LOWER(customer_email) = LOWER($1) 
           AND payment_status = 'paid'
         ORDER BY created_at ASC`,
        [email]
      );

      if (orderResult.rows.length === 0) {
        return res.status(200).json({ needsRecovery: false });
      }

      // Check if user has any form_submissions for player registration
      const submissionResult = await query(
        `SELECT id FROM form_submissions 
         WHERE LOWER(customer_email) = LOWER($1) 
           AND form_id = '2'
         LIMIT 1`,
        [email]
      );

      if (submissionResult.rows.length > 0) {
        // They already have a form submission - no recovery needed
        return res.status(200).json({ needsRecovery: false });
      }

      // Check if they have any team_players records
      const playerResult = await query(
        `SELECT id FROM team_players 
         WHERE LOWER(player_email) = LOWER($1)
         LIMIT 1`,
        [email]
      );

      if (playerResult.rows.length > 0) {
        // They have team_players - no recovery needed
        return res.status(200).json({ needsRecovery: false });
      }

      // User has paid orders but no registration records - needs recovery
      // Parse order items to extract what we already know
      const orders = orderResult.rows;
      const allItems = [];
      const playerNames = [];
      const sizes = {};

      for (const order of orders) {
        const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
        allItems.push(...items);
        
        for (const item of items) {
          if (item.id === 'basic-kit' && item.selectedSize) {
            // Parse "Player 1 - Cole Dennehy | Shirt: 11/12 years / Pants: 11/12 years"
            const match = item.selectedSize.match(/Player \d+ - (.+?) \| Shirt: (.+?) \/ Pants: (.+)/);
            if (match) {
              playerNames.push(match[1]);
              sizes.shirtSize = match[2];
              sizes.pantsSize = match[3];
            }
          }
        }
      }

      // Get list of all teams with their age group details for the dropdown
      const teamsResult = await query(
        `SELECT t.id, t.team_name, t.form_submission_uuid, t.age_group_teams, t.submission_data, t.shirt_design
         FROM teams t 
         WHERE t.status != 'rejected'
         ORDER BY t.team_name`
      );

      const teams = teamsResult.rows.map(t => {
        // Get age groups from submission_data field 33 (primary source) or age_group_teams column
        let ageGroups = [];
        
        // Try submission_data->33 first (most reliable source)
        if (t.submission_data) {
          const sd = typeof t.submission_data === 'string' ? JSON.parse(t.submission_data) : t.submission_data;
          const field33 = sd['33'] || sd[33];
          if (Array.isArray(field33) && field33.length > 0) {
            ageGroups = field33;
          }
        }
        
        // Fallback to age_group_teams column
        if (ageGroups.length === 0) {
          const agt = typeof t.age_group_teams === 'string' ? JSON.parse(t.age_group_teams) : (t.age_group_teams || []);
          if (Array.isArray(agt) && agt.length > 0) {
            ageGroups = agt;
          }
        }

        return {
          id: t.id,
          teamName: t.team_name,
          formSubmissionUuid: t.form_submission_uuid,
          shirtDesign: t.shirt_design || '',
          ageGroups: ageGroups.map(ag => ({
            teamName: (ag.teamName || t.team_name || '').trim(),
            gender: ag.gender || '',
            ageGroup: ag.ageGroup || '',
            coachName: ag.coachName || '',
            coachContact: ag.coachContact || '',
            teamNumber: ag.teamNumber || 1
          }))
        };
      });

      // Get available additional-apparel products
      const productsResult = await query(
        `SELECT id, name, price, image, sizes, design_id
         FROM products
         WHERE category = 'additional-apparel' AND active = true
         ORDER BY name`
      );

      const availableProducts = productsResult.rows.map(p => ({
        id: p.id,
        name: p.name,
        price: parseFloat(p.price),
        image: p.image || '',
        sizes: typeof p.sizes === 'string' ? JSON.parse(p.sizes) : (p.sizes || []),
        designId: p.design_id
      }));

      return res.status(200).json({
        needsRecovery: true,
        knownData: {
          parentName: orders[0].customer_name,
          parentEmail: email,
          parentPhone: orders[0].customer_phone,
          playerNames,
          sizes,
          orderNumbers: orders.map(o => o.order_number),
          orderItems: allItems,
          totalPaid: orders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0)
        },
        teams,
        availableProducts
      });

    } catch (error) {
      console.error('Complete registration check error:', error);
      return res.status(500).json({ error: 'Failed to check registration status' });
    }
  }

  // POST: Submit the recovery form data
  if (req.method === 'POST') {
    try {
      const {
        email,
        parentName,
        parentPhone,
        parentPhoneSecondary,
        password,
        teamFormSubmissionUuid,
        playerName,
        subTeam,          // { gender, ageGroup, teamName, coachName, coachContact, teamNumber }
        dob,
        shirtNumber,
        shirtSize,
        pantsSize,
        profileImage,     // base64 data URI (optional)
        birthCertificate, // base64 data URI (optional)
        cricClubsProfile, // { id, name, profileUrl } (optional)
        additionalItems   // [{ id, name, price, selectedSize, quantity, image }] (optional)
      } = req.body;

      if (!email || !teamFormSubmissionUuid || !playerName) {
        return res.status(400).json({ error: 'Email, team selection, and player name are required' });
      }

      // Resolve team from form_submission_uuid
      const teamResult = await query(
        `SELECT id, team_name FROM teams WHERE form_submission_uuid::text = $1 LIMIT 1`,
        [String(teamFormSubmissionUuid)]
      );
      const matchedTeam = teamResult.rows[0] || null;

      if (!matchedTeam) {
        return res.status(400).json({ error: 'Could not find the selected team' });
      }

      // Build the sub_team label
      let subTeamLabel = '';
      if (subTeam && typeof subTeam === 'object') {
        const name = (subTeam.teamName || matchedTeam.team_name || '').trim();
        const gender = (subTeam.gender || '').trim();
        const age = (subTeam.ageGroup || '').trim();
        if (name && gender && age) subTeamLabel = `${name} (${gender} - ${age})`;
        else if (name && age) subTeamLabel = `${name} (${age})`;
        else subTeamLabel = name || age || gender || '';
      }

      // Build full form submission data (matching the structure of a normal form_id=2 submission)
      // Retrieve original order items/total for _cartItems/_cartTotal fields
      let origCartItems = [];
      let origCartTotal = 0;
      try {
        const origOrderData = await query(
          `SELECT items, total_amount FROM orders WHERE LOWER(customer_email) = LOWER($1) AND payment_status = 'paid' ORDER BY created_at ASC LIMIT 1`,
          [email]
        );
        if (origOrderData.rows.length > 0) {
          origCartItems = typeof origOrderData.rows[0].items === 'string' ? JSON.parse(origOrderData.rows[0].items) : (origOrderData.rows[0].items || []);
          origCartTotal = parseFloat(origOrderData.rows[0].total_amount) || 0;
        }
      } catch (cartErr) {
        console.log('Could not retrieve original order items for form data:', cartErr.message);
      }

      const formData = {
        '6': playerName,
        '8': { id: teamFormSubmissionUuid, teamName: matchedTeam.team_name },
        '10': dob || '',
        '34': subTeam || '',
        '36': shirtNumber || '',
        '37': parentName,
        '38': email,
        '39': password || '',
        '40': parentPhone || '',
        '41': parentPhoneSecondary || '',
        '43': birthCertificate || '',
        '44': 1,
        '46': profileImage || '',
        '25_shirtSize': shirtSize || '',
        '25_pantsSize': pantsSize || '',
        'checkout_email': email,
        'checkout_firstName': (parentName || '').split(' ')[0] || '',
        'checkout_lastName': (parentName || '').split(' ').slice(1).join(' ') || '',
        'checkout_phone': parentPhone || '',
        'checkout_password': password || '',
        'existingCricClubsProfile': cricClubsProfile || null,
        '_cartItems': origCartItems,
        '_cartTotal': origCartTotal,
        '_recoveredRegistration': true,
        '_recoveredAt': new Date().toISOString()
      };

      // Check for duplicate submission
      const existingSubmission = await query(
        `SELECT id FROM form_submissions 
         WHERE LOWER(customer_email) = LOWER($1) AND form_id = '2'
         LIMIT 1`,
        [email]
      );

      if (existingSubmission.rows.length > 0) {
        return res.status(409).json({ error: 'Registration already exists for this email' });
      }

      // Check for duplicate team_player
      const existingPlayer = await query(
        `SELECT id FROM team_players 
         WHERE team_id = $1 
           AND LOWER(player_name) = LOWER($2)
           AND LOWER(COALESCE(player_email, '')) = LOWER($3)
         LIMIT 1`,
        [matchedTeam.id, playerName, email || '']
      );

      if (existingPlayer.rows.length > 0) {
        return res.status(409).json({ error: 'Player already registered for this team' });
      }

      // 1. Create form_submission
      const submissionResult = await query(
        `INSERT INTO form_submissions (form_name, form_id, data, customer_email, status, approval_status)
         VALUES ($1, $2, $3, $4, 'pending', 'pending')
         RETURNING id, created_at, status, approval_status`,
        ['Player Registration', '2', JSON.stringify(formData), email]
      );

      const submission = submissionResult.rows[0];
      console.log(`Recovery: Created form_submission ${submission.id} for ${email}`);

      // 2. Create team_player
      const registrationData = {
        formSubmissionId: submission.id,
        formId: '2',
        parentEmail: email,
        parentPhone: parentPhone,
        teamName: matchedTeam.team_name,
        subTeam: subTeamLabel,
        profileImage: profileImage || null,
        recoveredRegistration: true
      };

      const playerInsertResult = await query(
        `INSERT INTO team_players (
          team_id, sub_team, player_name, player_email, player_phone,
          jersey_size, jersey_number, registration_data, payment_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id`,
        [
          matchedTeam.id,
          subTeamLabel || null,
          playerName,
          email,
          parentPhone || null,
          shirtSize || null,
          shirtNumber ? parseInt(shirtNumber) : null,
          JSON.stringify(registrationData),
          'paid'  // Already paid — this is a recovery
        ]
      );

      console.log(`Recovery: Created team_player ${playerInsertResult.rows[0].id} for ${playerName} in team ${matchedTeam.team_name} (${subTeamLabel})`);

      // 3. Record kit markup revenue for the team (if applicable)
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
              `INSERT INTO team_revenue (team_id, revenue_type, amount, description, reference_id, payment_status)
               VALUES ($1, $2, $3, $4, $5, 'paid')`,
              [
                matchedTeam.id,
                'player-registration-markup',
                markup,
                `Kit markup for recovered player: ${playerName}`,
                String(submission.id)
              ]
            );
          }
        }
      } catch (revenueError) {
        console.log('Could not record kit markup revenue during recovery:', revenueError.message);
      }

      // 4. Update customer profile team_id (or create customer if missing)
      try {
        const customerResult = await query(
          `SELECT id, team_id FROM customers WHERE LOWER(email) = LOWER($1) LIMIT 1`,
          [email]
        );
        if (customerResult.rows.length > 0) {
          if (!customerResult.rows[0].team_id) {
            await query(
              `UPDATE customers SET team_id = $1, updated_at = NOW() WHERE id = $2`,
              [matchedTeam.id, customerResult.rows[0].id]
            );
          }
        } else {
          // Customer profile missing — create one (defensive recovery)
          const firstName = (parentName || '').split(' ')[0] || '';
          const lastName = (parentName || '').split(' ').slice(1).join(' ') || '';
          await query(
            `INSERT INTO customers (email, password_hash, first_name, last_name, phone, team_id, country)
             VALUES ($1, $2, $3, $4, $5, $6, 'South Africa')
             ON CONFLICT (email) DO NOTHING`,
            [email, password || '', firstName, lastName, parentPhone || '', matchedTeam.id]
          );
          console.log(`Recovery: Created missing customer profile for ${email}`);
        }
      } catch (updateError) {
        console.log('Could not update/create customer during recovery:', updateError.message);
      }

      // 5. Handle new player recording for CricClubs (if no existing profile)
      if (!cricClubsProfile) {
        try {
          const host = req.headers.host || '';
          const protocol = req.headers['x-forwarded-proto'] || 'http';
          const baseUrl = host ? `${protocol}://${host}` : (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000');
          await fetch(`${baseUrl}/api/new-players`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playerName,
              email,
              team: matchedTeam.team_name,
              dob: dob || '',
              submissionId: submission.id
            })
          });
        } catch (newPlayerError) {
          console.log('Could not record new player during recovery:', newPlayerError.message);
        }
      }

      // 6. Handle additional product purchases (append to original order + create payment)
      let paymentRequired = false;
      let paymentUrl = null;
      let addonOrderNumber = null;

      if (Array.isArray(additionalItems) && additionalItems.length > 0) {
        try {
          const addonTotal = additionalItems.reduce((sum, item) => sum + (parseFloat(item.price) * (item.quantity || 1)), 0);
          
          if (addonTotal > 0) {
            // Build items array for the addon order
            const addonItems = additionalItems.map(item => ({
              id: item.id,
              name: item.name,
              price: parseFloat(item.price),
              quantity: item.quantity || 1,
              selectedSize: item.selectedSize || null,
              image: item.image || null,
              category: 'additional-apparel'
            }));

            // Create addon order (use standard ORD{timestamp} format for Yoco verify/webhook compatibility)
            addonOrderNumber = `ORD${Date.now()}`;
            const fullName = parentName || email;
            
            await query(
              `INSERT INTO orders (order_number, customer_email, customer_name, customer_phone, total_amount, items, status, payment_status, order_type, notes)
               VALUES ($1, $2, $3, $4, $5, $6, 'pending', 'pending', 'additional-apparel', $7)`,
              [
                addonOrderNumber,
                email,
                fullName,
                parentPhone || '',
                addonTotal,
                JSON.stringify(addonItems),
                `Additional apparel purchase from recovery form. Original order(s): ${(await query(`SELECT order_number FROM orders WHERE LOWER(customer_email) = LOWER($1) AND payment_status = 'paid' ORDER BY created_at ASC`, [email])).rows.map(r => r.order_number).join(', ')}`
              ]
            );

            console.log(`Recovery: Created addon order ${addonOrderNumber} for ${email}, total: R${addonTotal}`);

            // NOTE: Addon items are NOT merged into the original order.
            // The addon order stands alone to prevent double-counting of items and revenue.
            // Admin/manufacturer views query both registration and additional-apparel orders.

            // Create Yoco checkout for the addon order
            const config = await getYocoConfig();
            if (config.secretKey) {
              const protocol = req.headers['x-forwarded-proto'] || 'https';
              const host = req.headers['x-forwarded-host'] || req.headers.host;
              const origin = `${protocol}://${host}`;
              const amountInCents = Math.round(addonTotal * 100);

              const yocoResponse = await fetch('https://payments.yoco.com/api/checkouts', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${config.secretKey}`
                },
                body: JSON.stringify({
                  amount: amountInCents,
                  currency: 'ZAR',
                  successUrl: `${origin}/checkout/success?order=${addonOrderNumber}&gateway=yoco`,
                  cancelUrl: `${origin}/parent-portal?payment=cancelled`,
                  failureUrl: `${origin}/parent-portal?payment=failed`,
                  metadata: {
                    orderId: addonOrderNumber,
                    customerEmail: email,
                    customerName: fullName,
                    itemDescription: `Additional apparel (${additionalItems.length} item${additionalItems.length > 1 ? 's' : ''})`
                  }
                })
              });

              const yocoData = await yocoResponse.json();

              if (yocoResponse.ok && yocoData.redirectUrl) {
                paymentRequired = true;
                paymentUrl = yocoData.redirectUrl;

                // Store checkout ID on the addon order
                await query(
                  `UPDATE orders SET gateway_checkout_id = $1, updated_at = NOW() WHERE order_number = $2`,
                  [yocoData.id, addonOrderNumber]
                );
                console.log(`Recovery: Yoco checkout created for addon order ${addonOrderNumber}, checkout: ${yocoData.id}`);
              } else {
                console.error('Failed to create Yoco checkout for addon:', yocoData);
              }
            }
          }
        } catch (addonError) {
          console.error('Error processing additional items:', addonError);
          // Don't fail the whole registration — products are optional
        }
      }

      return res.status(200).json({
        success: true,
        formSubmissionId: submission.id,
        teamPlayerId: playerInsertResult.rows[0].id,
        teamName: matchedTeam.team_name,
        subTeam: subTeamLabel,
        playerName,
        paymentRequired,
        paymentUrl,
        addonOrderNumber
      });

    } catch (error) {
      console.error('Complete registration error:', error);
      return res.status(500).json({ error: 'Failed to complete registration', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
