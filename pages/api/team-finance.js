// Team revenue and payout requests API
import { query } from '../../lib/db';

function formatPayout(row) {
  return {
    id: row.id,
    teamId: row.team_id,
    teamName: row.team_name,
    amount: parseFloat(row.amount || 0),
    bankName: row.bank_name,
    accountNumber: row.account_number,
    branchCode: row.branch_code,
    accountType: row.account_type,
    status: row.status,
    adminNotes: row.admin_notes,
    requestedAt: row.requested_at,
    requested_at: row.requested_at,
    processedAt: row.processed_at,
    processed_at: row.processed_at
  };
}

export default async function handler(req, res) {
  const { teamId, action, type } = req.query;

  // Support both action and type query parameters
  const operationType = action || type;

  // GET requests
  if (req.method === 'GET') {
    try {
      // Get revenue for a team
      if (operationType === 'revenue') {
        if (!teamId) {
          return res.status(400).json({ error: 'Team ID is required' });
        }

        const result = await query(
          `SELECT tr.*, tp.player_name
           FROM team_revenue tr
           LEFT JOIN team_players tp 
             ON tp.team_id = tr.team_id 
             AND tp.registration_data->>'formSubmissionId' = tr.reference_id
           WHERE tr.team_id = $1 AND tr.payment_status = 'paid'
           ORDER BY tr.created_at DESC`,
          [teamId]
        );

        let markup = 0;
        let commission = 0;
        
        result.rows.forEach(r => {
          const amount = parseFloat(r.amount || 0);
          if (r.revenue_type === 'player-registration-markup') {
            markup += amount;
          } else if (r.revenue_type === 'product-commission') {
            commission += amount;
          }
        });

        // Also get pending revenue for info display
        const pendingResult = await query(
          `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
           FROM team_revenue
           WHERE team_id = $1 AND payment_status = 'pending_payment'`,
          [teamId]
        );
        const pendingCount = parseInt(pendingResult.rows[0]?.count || 0);
        const pendingTotal = parseFloat(pendingResult.rows[0]?.total || 0);
        
        return res.status(200).json({ 
          revenue: result.rows.map(r => {
            // Extract player name from joined table or from description
            let playerName = r.player_name || '';
            if (!playerName && r.description) {
              const match = r.description.match(/player:\s*(.+?)(?:\s*\(|$)/i);
              if (match) playerName = match[1].trim();
            }
            return {
              id: r.id,
              type: r.revenue_type,
              amount: parseFloat(r.amount || 0),
              description: r.description,
              playerName,
              referenceId: r.reference_id,
              date: r.created_at
            };
          }),
          total: markup + commission,
          markup,
          commission,
          pendingCount,
          pendingTotal
        });
      }

      // Get pending payout for a team
      if (operationType === 'pendingPayout') {
        if (!teamId) {
          return res.status(400).json({ error: 'Team ID is required' });
        }

        const result = await query(
          `SELECT p.*, t.team_name FROM payout_requests p 
           JOIN teams t ON p.team_id = t.id 
           WHERE p.team_id = $1 AND p.status = 'pending'`,
          [teamId]
        );

        return res.status(200).json({ 
          request: result.rows.length > 0 ? formatPayout(result.rows[0]) : null
        });
      }

      // Get all payouts for a team
      if (operationType === 'payouts') {
        if (!teamId) {
          return res.status(400).json({ error: 'Team ID is required' });
        }

        const result = await query(
          `SELECT p.*, t.team_name FROM payout_requests p 
           JOIN teams t ON p.team_id = t.id 
           WHERE p.team_id = $1 
           ORDER BY p.requested_at DESC`,
          [teamId]
        );

        return res.status(200).json({ 
          requests: result.rows.map(formatPayout)
        });
      }

      // Get all payouts (for admin)
      if (operationType === 'allPayouts') {
        const result = await query(
          `SELECT p.*, t.team_name, t.coach_name, t.email, t.phone 
           FROM payout_requests p 
           JOIN teams t ON p.team_id = t.id 
           ORDER BY p.requested_at DESC`
        );

        return res.status(200).json({ 
          requests: result.rows.map(r => ({
            ...formatPayout(r),
            coachName: r.coach_name,
            email: r.email,
            phone: r.phone
          }))
        });
      }

      return res.status(400).json({ error: 'Invalid action' });

    } catch (error) {
      console.error('Error in GET:', error);
      return res.status(500).json({ error: 'Server error', details: error.message });
    }
  }

  // POST requests
  if (req.method === 'POST') {
    try {
      const body = req.body;
      const postAction = body.action || operationType;

      // Add revenue
      if (postAction === 'addRevenue') {
        const { teamId: tid, revenueType, amount, description, referenceId } = body;

        if (!tid || !revenueType || amount === undefined) {
          return res.status(400).json({ error: 'Team ID, revenue type, and amount are required' });
        }

        const result = await query(
          `INSERT INTO team_revenue (team_id, revenue_type, amount, description, reference_id, payment_status)
           VALUES ($1, $2, $3, $4, $5, 'paid')
           RETURNING *`,
          [tid, revenueType, amount, description, referenceId]
        );

        return res.status(201).json({ 
          success: true, 
          revenue: {
            id: result.rows[0].id,
            type: result.rows[0].revenue_type,
            amount: parseFloat(result.rows[0].amount),
            description: result.rows[0].description,
            date: result.rows[0].created_at
          }
        });
      }

      // Create payout request
      if (postAction === 'createPayout') {
        const tid = body.teamId;

        if (!tid) {
          return res.status(400).json({ error: 'Team ID is required' });
        }

        // Get team's revenue breakdown (only paid revenue)
        const revenueResult = await query(
          `SELECT * FROM team_revenue WHERE team_id = $1 AND payment_status = 'paid'`,
          [tid]
        );

        let markup = 0;
        let commission = 0;
        
        revenueResult.rows.forEach(r => {
          const amount = parseFloat(r.amount || 0);
          if (r.revenue_type === 'player-registration-markup') {
            markup += amount;
          } else if (r.revenue_type === 'product-commission') {
            commission += amount;
          }
        });

        const totalAmount = markup + commission;

        if (totalAmount <= 0) {
          return res.status(400).json({ error: 'No revenue available for payout' });
        }

        // Check for existing pending request
        const existingPending = await query(
          `SELECT id FROM payout_requests WHERE team_id = $1 AND status = 'pending'`,
          [tid]
        );

        if (existingPending.rows.length > 0) {
          return res.status(409).json({ error: 'Team already has a pending payout request' });
        }

        // Get team banking details
        const teamResult = await query(
          `SELECT * FROM teams WHERE id = $1`,
          [tid]
        );

        if (teamResult.rows.length === 0) {
          return res.status(404).json({ error: 'Team not found' });
        }

        const team = teamResult.rows[0];
        const bankingDetails = team.banking_details || {};

        const result = await query(
          `INSERT INTO payout_requests (team_id, amount, bank_name, account_number, branch_code, account_type, breakdown)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [
            tid, 
            totalAmount, 
            bankingDetails.bankName || null,
            bankingDetails.accountNumber || null,
            bankingDetails.branchCode || null,
            bankingDetails.accountType || null,
            JSON.stringify({ markup, commission, total: totalAmount })
          ]
        );

        return res.status(201).json({ 
          success: true, 
          request: {
            ...formatPayout(result.rows[0]),
            teamName: team.team_name,
            coachName: team.coach_name,
            email: team.email,
            phone: team.phone,
            breakdown: { markup, commission, total: totalAmount }
          }
        });
      }

      return res.status(400).json({ error: 'Invalid action' });

    } catch (error) {
      console.error('Error in POST:', error);
      return res.status(500).json({ error: 'Server error', details: error.message });
    }
  }

  // PUT requests (process/reject payouts)
  if (req.method === 'PUT') {
    try {
      const body = req.body;
      const putAction = body.action;

      // Process payout (mark as paid)
      if (putAction === 'processPayout') {
        const { payoutId, notes } = body;

        if (!payoutId) {
          return res.status(400).json({ error: 'Payout ID is required' });
        }

        const result = await query(
          `UPDATE payout_requests 
           SET status = 'paid', admin_notes = $1, processed_at = NOW()
           WHERE id = $2
           RETURNING *`,
          [notes || '', payoutId]
        );

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Payout request not found' });
        }

        // Clear only PAID team revenue after payout (pending stays for when they pay)
        const payout = result.rows[0];
        await query(
          `DELETE FROM team_revenue WHERE team_id = $1 AND payment_status = 'paid'`,
          [payout.team_id]
        );

        return res.status(200).json({ 
          success: true, 
          request: formatPayout(result.rows[0])
        });
      }

      // Reject payout
      if (putAction === 'rejectPayout') {
        const { payoutId, notes } = body;

        if (!payoutId) {
          return res.status(400).json({ error: 'Payout ID is required' });
        }

        const result = await query(
          `UPDATE payout_requests 
           SET status = 'rejected', admin_notes = $1, processed_at = NOW()
           WHERE id = $2
           RETURNING *`,
          [notes || '', payoutId]
        );

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Payout request not found' });
        }

        return res.status(200).json({ 
          success: true, 
          request: formatPayout(result.rows[0])
        });
      }

      return res.status(400).json({ error: 'Invalid action' });

    } catch (error) {
      console.error('Error in PUT:', error);
      return res.status(500).json({ error: 'Server error', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
