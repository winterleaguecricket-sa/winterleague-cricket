// Shared helper to send parent payment success email after order is confirmed
// Called by both yoco/verify.js and yoco/webhook.js
import { query } from './db';
import { sendParentEmail } from './email';

/**
 * Send payment success email to parent after their order is confirmed.
 * Looks up submission data (player names, team, parent credentials) from DB.
 * 
 * @param {string} orderNumber - The order number (e.g. ORD1234567890)
 * @param {string} customerEmail - The parent's email address
 * @param {string} customerName - The parent's name
 * @param {string|number} totalAmount - The order total in Rands
 */
export async function sendParentPaymentSuccessEmail(orderNumber, customerEmail, customerName, totalAmount) {
  try {
    if (!customerEmail) {
      console.log('sendParentPaymentSuccessEmail: no customer email — skipping');
      return { skipped: true, reason: 'No customer email' };
    }

    // Look up parent's password from customers table
    let password = '';
    try {
      const profileResult = await query(
        `SELECT password_hash FROM customers WHERE LOWER(email) = LOWER($1) LIMIT 1`,
        [customerEmail]
      );
      if (profileResult.rows.length > 0) {
        password = profileResult.rows[0].password_hash || '';
      }
    } catch (err) {
      console.log('Could not look up parent password:', err.message);
    }

    // Look up player names and team from form submissions for this parent
    let playerNames = [];
    let teamName = '';
    try {
      const submissionsResult = await query(
        `SELECT data FROM form_submissions 
         WHERE form_id = '2' AND LOWER(customer_email) = LOWER($1)
         ORDER BY created_at DESC LIMIT 10`,
        [customerEmail]
      );

      for (const row of submissionsResult.rows) {
        const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
        const pName = data?.[6] || data?.['6'] || '';
        if (pName && !playerNames.includes(pName)) {
          playerNames.push(pName);
        }
        // Get team name from team selection field (field 8)
        if (!teamName) {
          const teamField = data?.[8] || data?.['8'];
          if (teamField && typeof teamField === 'object') {
            teamName = teamField.teamName || teamField.label || teamField.name || '';
          } else if (typeof teamField === 'string') {
            try {
              const parsed = JSON.parse(teamField);
              teamName = parsed.teamName || parsed.label || parsed.name || '';
            } catch (e) {
              // Field 8 stores a UUID (form_submission_uuid of the team) — look up the team name
              teamName = ''; // Will be resolved below
            }
          }
          // If teamName is still empty or looks like a UUID, resolve from teams table
          if (!teamName || /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(teamName)) {
            const teamUuid = typeof teamField === 'string' ? teamField : (teamField?.id || '');
            if (teamUuid) {
              try {
                const teamResult = await query(
                  `SELECT team_name FROM teams WHERE form_submission_uuid = $1 LIMIT 1`,
                  [teamUuid]
                );
                if (teamResult.rows.length > 0) {
                  teamName = teamResult.rows[0].team_name || '';
                }
              } catch (teamErr) {
                console.log('Could not look up team name from UUID:', teamErr.message);
              }
            }
            // Fallback: look up team via team_players association
            if (!teamName) {
              try {
                const tpResult = await query(
                  `SELECT t.team_name FROM team_players tp
                   JOIN teams t ON t.id = tp.team_id
                   WHERE LOWER(tp.player_email) = LOWER($1)
                   ORDER BY tp.created_at DESC LIMIT 1`,
                  [customerEmail]
                );
                if (tpResult.rows.length > 0) {
                  teamName = tpResult.rows[0].team_name || '';
                }
              } catch (tpErr) {
                console.log('Could not look up team from team_players:', tpErr.message);
              }
            }
          }
        }
      }
    } catch (err) {
      console.log('Could not look up player submissions:', err.message);
    }

    const playerNameStr = playerNames.length > 0 ? playerNames.join(', ') : 'your player(s)';
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://winterleaguecricket.co.za';

    const result = await sendParentEmail({
      templateKey: 'parentPaymentSuccess',
      parentName: customerName || 'Parent',
      playerName: playerNameStr,
      teamName: teamName || '',
      email: customerEmail,
      password: password,
      orderNumber: orderNumber || '',
      totalAmount: typeof totalAmount === 'number' ? totalAmount.toFixed(2) : String(totalAmount || '0.00'),
      loginUrl: `${baseUrl}/parent-portal`
    });

    console.log(`Parent payment success email result for ${orderNumber}:`, result);
    return result;

  } catch (error) {
    console.error('Error in sendParentPaymentSuccessEmail:', error.message);
    return { success: false, message: error.message };
  }
}
