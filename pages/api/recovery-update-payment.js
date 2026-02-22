// API endpoint to update team_player payment status after recovery
// Called by the recover-registration page after re-creating the form submission
import { query } from '../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, playerName } = req.body;

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
      return res.json({ success: true, message: 'No paid order found — payment status unchanged' });
    }

    const order = orderResult.rows[0];

    // Update all team_players for this email to paid
    // Note: team_players table doesn't have an order_id column, so we only update payment_status
    const updateResult = await query(
      `UPDATE team_players 
       SET payment_status = 'paid'
       WHERE LOWER(player_email) = LOWER($1) 
         AND (payment_status IS NULL OR payment_status = 'pending_payment')
       RETURNING id, player_name`,
      [email]
    );

    console.log(`Recovery: Updated ${updateResult.rows.length} team_players to paid for ${email} (order ${order.order_number})`);

    return res.json({
      success: true,
      updated: updateResult.rows.length,
      players: updateResult.rows.map(r => r.player_name),
      orderId: order.order_number
    });
  } catch (error) {
    console.error('Recovery payment update error:', error);
    return res.status(500).json({ error: error.message });
  }
}
