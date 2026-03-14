// API endpoint for orders management - Database backed
import {
  getAllOrders,
  getProductOrders,
  getPlayerRegistrationOrders,
  getTeamRegistrationOrders,
  getOrderById,
  getOrdersByEmail,
  createOrder,
  updateOrderStatus,
  updateOrder,
  deleteOrder,
  addTrackingInfo,
  getOrderStats,
  getProductOrderStats,
  getPlayerRegistrationStats,
  getTeamRegistrationStats
} from '../../data/orders-db';
import { logApiError, logPaymentEvent } from '../../lib/logger';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { id, email, type, stats } = req.query;

      // Stats endpoint
      if (stats === 'true' || stats === '1') {
        const orderType = type || 'all';
        let result;
        if (orderType === 'products') result = await getProductOrderStats();
        else if (orderType === 'player-registration') result = await getPlayerRegistrationStats();
        else if (orderType === 'team-registration') result = await getTeamRegistrationStats();
        else result = await getOrderStats();
        return res.status(200).json({ stats: result });
      }

      if (id) {
        const order = await getOrderById(id);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        return res.status(200).json({ order });
      }

      if (email) {
        const orders = await getOrdersByEmail(email);
        return res.status(200).json({ orders });
      }

      // Filter by type
      const orderType = type || 'all';
      let orders;
      if (orderType === 'products') orders = await getProductOrders();
      else if (orderType === 'player-registration') orders = await getPlayerRegistrationOrders();
      else if (orderType === 'team-registration') orders = await getTeamRegistrationOrders();
      else orders = await getAllOrders();

      return res.status(200).json({ orders });
    }

    if (req.method === 'POST') {
      const { action } = req.body;

      if (action === 'create') {
        const order = await createOrder(req.body.orderData || req.body);
        return res.status(200).json({ order });
      }

      if (action === 'update-status') {
        const { orderId, status, notes } = req.body;
        const order = await updateOrderStatus(orderId, status, notes || '');
        if (!order) return res.status(404).json({ error: 'Order not found' });
        return res.status(200).json({ order });
      }

      if (action === 'add-tracking') {
        const { orderId, trackingNumber, courier } = req.body;
        const order = await addTrackingInfo(orderId, trackingNumber, courier);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        return res.status(200).json({ order });
      }

      if (action === 'update-refund-status') {
        const { orderId, refundStatus, removePlayer } = req.body;
        if (!orderId || !['pending', 'completed'].includes(refundStatus)) {
          return res.status(400).json({ error: 'orderId and valid refundStatus (pending/completed) required' });
        }
        const db = await import('../../lib/db');
        const result = await db.query(
          'UPDATE orders SET refund_status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
          [refundStatus, orderId]
        );
        if (!result.rows[0]) return res.status(404).json({ error: 'Order not found' });

        const removedPlayers = [];
        // When refund is completed on a registration order AND removePlayer is true, remove the player from the team
        if (refundStatus === 'completed' && removePlayer === true) {
          const order = result.rows[0];
          const orderType = order.order_type || '';
          if (orderType === 'registration') {
            const email = order.customer_email;
            // Extract player names from order items (format: "Player 1 - NAME | ...")
            const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
            const playerNames = [];
            for (const item of items) {
              const sizeStr = item.selectedSize || item.selected_size || '';
              const match = sizeStr.match(/Player\s*\d+\s*-\s*([^|]+)/i);
              if (match) playerNames.push(match[1].trim());
            }

            if (email && playerNames.length > 0) {
              for (const playerName of playerNames) {
                // Remove from team_players
                const tpResult = await db.query(
                  `DELETE FROM team_players WHERE LOWER(player_email) = LOWER($1) AND LOWER(player_name) = LOWER($2) RETURNING id, team_id, player_name`,
                  [email, playerName]
                );
                // Remove from new_players
                await db.query(
                  `DELETE FROM new_players WHERE LOWER(email) = LOWER($1) AND LOWER(player_name) = LOWER($2)`,
                  [email, playerName]
                );
                // Mark form_submissions as refunded
                await db.query(
                  `UPDATE form_submissions SET status = 'refunded' WHERE LOWER(customer_email) = LOWER($1) AND LOWER(data->>'6') = LOWER($2) AND form_id = '2'`,
                  [email, playerName]
                );
                if (tpResult.rows.length > 0) {
                  removedPlayers.push(tpResult.rows[0].player_name);
                }
              }
            }
          }
        }

        return res.status(200).json({ success: true, refundStatus, removedPlayers });
      }

      return res.status(400).json({ error: 'Unknown action' });
    }

    if (req.method === 'PUT') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'ID is required' });
      const order = await updateOrder(id, req.body);
      if (!order) return res.status(404).json({ error: 'Order not found' });
      return res.status(200).json({ order });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'ID is required' });
      const deleted = await deleteOrder(id);
      if (!deleted) return res.status(404).json({ error: 'Order not found' });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Orders API error:', error);
    logApiError({ method: req.method, url: req.url, statusCode: 500, error, body: req.body, query: req.query });
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
