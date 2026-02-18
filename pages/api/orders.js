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
