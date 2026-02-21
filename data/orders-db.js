// Orders data management - PostgreSQL backed
// All functions are async and use the database
import { query } from '../lib/db';

// Helper to convert DB row to app order format
function rowToOrder(row) {
  if (!row) return null;
  return {
    id: row.id,
    orderNumber: row.order_number,
    customerName: row.customer_name || '',
    customerEmail: row.customer_email || '',
    customerPhone: row.customer_phone || '',
    customerId: row.customer_id || null,
    items: row.items || [],
    subtotal: parseFloat(row.subtotal) || 0,
    shipping: parseFloat(row.shipping_cost) || 0,
    total: parseFloat(row.total_amount) || 0,
    status: row.status || 'pending',
    statusNotes: row.status_notes || '',
    statusHistory: row.status_history || [],
    paymentMethod: row.payment_method || '',
    paymentStatus: row.payment_status || 'pending',
    orderType: row.order_type || 'product',
    tracking: row.tracking || null,
    shippingAddress: {
      street: row.shipping_address || '',
      city: row.shipping_city || '',
      province: row.shipping_province || '',
      postalCode: row.shipping_postal_code || ''
    },
    notes: row.notes || '',
    refundStatus: row.refund_status || null,
    gatewayCheckoutId: row.gateway_checkout_id || null,
    gatewayPaymentId: row.gateway_payment_id || null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : '',
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : ''
  };
}

// Get all orders
export async function getAllOrders() {
  const result = await query('SELECT * FROM orders ORDER BY created_at DESC');
  return result.rows.map(rowToOrder);
}

// Get product orders (excluding registrations)
export async function getProductOrders() {
  const result = await query(
    "SELECT * FROM orders WHERE order_type NOT IN ('player-registration', 'team-registration') ORDER BY created_at DESC"
  );
  return result.rows.map(rowToOrder);
}

// Get player registration orders
export async function getPlayerRegistrationOrders() {
  const result = await query(
    "SELECT * FROM orders WHERE order_type = 'player-registration' ORDER BY created_at DESC"
  );
  return result.rows.map(rowToOrder);
}

// Get team registration orders
export async function getTeamRegistrationOrders() {
  const result = await query(
    "SELECT * FROM orders WHERE order_type = 'team-registration' ORDER BY created_at DESC"
  );
  return result.rows.map(rowToOrder);
}

// Get order by ID
export async function getOrderById(id) {
  const result = await query('SELECT * FROM orders WHERE id = $1', [id]);
  return rowToOrder(result.rows[0]);
}

// Get orders by customer email
export async function getOrdersByEmail(email) {
  if (!email) return [];
  const result = await query(
    'SELECT * FROM orders WHERE LOWER(customer_email) = LOWER($1) ORDER BY created_at DESC',
    [email.trim()]
  );
  return result.rows.map(rowToOrder);
}

// Get orders by status
export async function getOrdersByStatus(status) {
  const result = await query(
    'SELECT * FROM orders WHERE status = $1 ORDER BY created_at DESC',
    [status]
  );
  return result.rows.map(rowToOrder);
}

// Create new order
export async function createOrder(orderData) {
  const orderNumber = orderData.orderNumber || `WLC-${Date.now()}`;

  const result = await query(
    `INSERT INTO orders (
      id, order_number, customer_id, customer_email, customer_name, customer_phone,
      items, subtotal, shipping_cost, total_amount,
      status, payment_method, payment_status, order_type,
      shipping_address, shipping_city, shipping_province, shipping_postal_code,
      status_history, notes, created_at, updated_at
    ) VALUES (
      uuid_generate_v4(), $1, $2, $3, $4, $5,
      $6, $7, $8, $9,
      $10, $11, $12, $13,
      $14, $15, $16, $17,
      $18, $19, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ) RETURNING *`,
    [
      orderNumber,
      orderData.customerId || null,
      orderData.customerEmail || '',
      orderData.customerName || '',
      orderData.customerPhone || '',
      JSON.stringify(orderData.items || []),
      orderData.subtotal || orderData.total || 0,
      orderData.shipping || 0,
      orderData.total || 0,
      orderData.status || 'pending',
      orderData.paymentMethod || '',
      orderData.paymentStatus || 'pending',
      orderData.orderType || 'product',
      orderData.shippingAddress?.street || orderData.shippingAddress?.address || '',
      orderData.shippingAddress?.city || '',
      orderData.shippingAddress?.province || '',
      orderData.shippingAddress?.postalCode || '',
      JSON.stringify([{ status: 'pending', notes: 'Order placed', timestamp: new Date().toISOString() }]),
      orderData.notes || ''
    ]
  );

  return rowToOrder(result.rows[0]);
}

// Update order status
export async function updateOrderStatus(id, status, notes = '') {
  // First get current status_history
  const existing = await getOrderById(id);
  if (!existing) return null;

  const history = Array.isArray(existing.statusHistory) ? [...existing.statusHistory] : [];
  history.push({ status, notes, timestamp: new Date().toISOString() });

  const result = await query(
    `UPDATE orders SET status = $1, status_notes = $2, status_history = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *`,
    [status, notes, JSON.stringify(history), id]
  );

  return rowToOrder(result.rows[0]);
}

// Update order
export async function updateOrder(id, updates) {
  const setClauses = [];
  const values = [];
  let idx = 1;

  const fieldMap = {
    customerName: 'customer_name',
    customerEmail: 'customer_email',
    customerPhone: 'customer_phone',
    status: 'status',
    statusNotes: 'status_notes',
    paymentMethod: 'payment_method',
    paymentStatus: 'payment_status',
    orderType: 'order_type',
    notes: 'notes'
  };

  for (const [appKey, dbCol] of Object.entries(fieldMap)) {
    if (updates[appKey] !== undefined) {
      setClauses.push(`${dbCol} = $${idx}`);
      values.push(updates[appKey]);
      idx++;
    }
  }

  if (updates.items !== undefined) {
    setClauses.push(`items = $${idx}`);
    values.push(JSON.stringify(updates.items));
    idx++;
  }
  if (updates.total !== undefined) {
    setClauses.push(`total_amount = $${idx}`);
    values.push(updates.total);
    idx++;
  }
  if (updates.tracking !== undefined) {
    setClauses.push(`tracking = $${idx}`);
    values.push(JSON.stringify(updates.tracking));
    idx++;
  }

  if (setClauses.length === 0) return null;

  values.push(id);
  const result = await query(
    `UPDATE orders SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} RETURNING *`,
    values
  );

  return rowToOrder(result.rows[0]);
}

// Delete order
export async function deleteOrder(id) {
  // Also delete order_items if any
  await query('DELETE FROM order_items WHERE order_id = $1', [id]);
  const result = await query('DELETE FROM orders WHERE id = $1', [id]);
  return result.rowCount > 0;
}

// Add tracking info to order
export async function addTrackingInfo(id, trackingNumber, courier) {
  const tracking = {
    number: trackingNumber,
    courier,
    addedAt: new Date().toISOString()
  };

  const result = await query(
    `UPDATE orders SET tracking = $1, tracking_number = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *`,
    [JSON.stringify(tracking), trackingNumber, id]
  );

  return rowToOrder(result.rows[0]);
}

// Helper to compute stats from orders array
function computeStats(ordersList) {
  return {
    total: ordersList.length,
    pending: ordersList.filter(o => o.status === 'pending').length,
    confirmed: ordersList.filter(o => o.status === 'confirmed').length,
    in_production: ordersList.filter(o => o.status === 'in_production').length,
    delivered_to_manager: ordersList.filter(o => o.status === 'delivered_to_manager').length,
    cancelled: ordersList.filter(o => o.status === 'cancelled').length,
    totalRevenue: ordersList
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (o.total || 0), 0)
  };
}

// Get order statistics
export async function getOrderStats() {
  const orders = await getAllOrders();
  return computeStats(orders);
}

// Get product order stats
export async function getProductOrderStats() {
  const orders = await getProductOrders();
  return computeStats(orders);
}

// Get player registration stats
export async function getPlayerRegistrationStats() {
  const orders = await getPlayerRegistrationOrders();
  return computeStats(orders);
}

// Get team registration stats
export async function getTeamRegistrationStats() {
  const orders = await getTeamRegistrationOrders();
  return computeStats(orders);
}
