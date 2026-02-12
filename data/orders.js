// Orders data management
// Note: adminSettings uses Node.js fs module - fetch via API instead

let orders = [];
let orderIdCounter = 1000;

// Get all orders
export function getAllOrders() {
  return orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// Get product orders (excluding player registrations)
export function getProductOrders() {
  return orders
    .filter(order => order.orderType !== 'player-registration' && order.orderType !== 'team-registration')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// Get player registration orders
export function getPlayerRegistrationOrders() {
  return orders
    .filter(order => order.orderType === 'player-registration')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// Get team registration orders
export function getTeamRegistrationOrders() {
  return orders
    .filter(order => order.orderType === 'team-registration')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// Get order by ID
export function getOrderById(id) {
  return orders.find(order => order.id === id);
}

// Get orders by customer email
export function getOrdersByEmail(email) {
  return orders.filter(order => order.customerEmail.toLowerCase() === email.toLowerCase());
}

// Get orders by status
export function getOrdersByStatus(status) {
  return orders.filter(order => order.status === status);
}

// Helper function to send order emails
async function sendOrderEmails(order) {
  try {
    // Only send emails for product orders (not registration orders)
    if (order.orderType === 'player-registration' || order.orderType === 'team-registration') {
      return;
    }

    // Fetch admin settings via API (adminSettings uses Node.js fs, can't run client-side)
    const [settingsRes, customerTemplateRes, supplierTemplateRes] = await Promise.all([
      fetch('/api/admin-settings'),
      fetch('/api/admin-settings?template=orderConfirmation'),
      fetch('/api/admin-settings?template=supplierForward')
    ]);
    
    const settings = await settingsRes.json();
    const customerTemplate = await customerTemplateRes.json();
    const supplierTemplate = await supplierTemplateRes.json();

    if (!customerTemplate?.subject || !supplierTemplate?.subject) {
      console.error('Order email templates not found');
      return;
    }

    // Format order items for email
    const orderItemsText = order.items.map(item => 
      `- ${item.name} x${item.quantity}${item.size ? ` (${item.size})` : ''} - R${(item.price * item.quantity).toFixed(2)}`
    ).join('\n');

    // Format shipping address
    const shippingAddressText = `${order.shippingAddress.street}
${order.shippingAddress.city}, ${order.shippingAddress.province}
${order.shippingAddress.postalCode}`;

    // Prepare customer email data
    const customerEmailData = {
      subject: customerTemplate.subject
        .replace('{orderNumber}', order.orderNumber),
      body: customerTemplate.body
        .replace('{customerName}', order.customerName)
        .replace('{orderNumber}', order.orderNumber)
        .replace('{orderDate}', new Date(order.createdAt).toLocaleDateString())
        .replace('{totalAmount}', order.total.toFixed(2))
        .replace('{orderItems}', orderItemsText)
        .replace('{shippingAddress}', shippingAddressText)
    };

    // Prepare supplier email data
    const supplierEmailData = {
      subject: supplierTemplate.subject
        .replace('{orderNumber}', order.orderNumber),
      body: supplierTemplate.body
        .replace('{orderNumber}', order.orderNumber)
        .replace('{orderDate}', new Date(order.createdAt).toLocaleDateString())
        .replace('{totalAmount}', order.total.toFixed(2))
        .replace('{customerName}', order.customerName)
        .replace('{customerEmail}', order.customerEmail)
        .replace('{customerPhone}', order.customerPhone || 'N/A')
        .replace('{orderItems}', orderItemsText)
        .replace('{shippingAddress}', shippingAddressText)
    };

    // Send emails via API
    await fetch('/api/send-order-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerEmail: order.customerEmail,
        supplierEmail: settings.supplierEmail,
        customerEmailData,
        supplierEmailData
      })
    });

    console.log(`Order emails sent for ${order.orderNumber}`);
  } catch (error) {
    console.error('Error sending order emails:', error);
  }
}

// Create new order
export function createOrder(orderData) {
  const newOrder = {
    id: orderIdCounter++,
    orderNumber: `WLC-${orderIdCounter}`,
    ...orderData,
    status: orderData.status || 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  orders.push(newOrder);
  
  // Send automated emails for product orders
  sendOrderEmails(newOrder);
  
  return newOrder;
}

// Update order status
export function updateOrderStatus(id, status, notes = '') {
  const order = getOrderById(id);
  if (order) {
    order.status = status;
    order.statusNotes = notes;
    order.updatedAt = new Date().toISOString();
    
    // Add to status history
    if (!order.statusHistory) {
      order.statusHistory = [];
    }
    order.statusHistory.push({
      status,
      notes,
      timestamp: new Date().toISOString()
    });
    
    return order;
  }
  return null;
}

// Update order
export function updateOrder(id, updates) {
  const index = orders.findIndex(o => o.id === id);
  if (index !== -1) {
    orders[index] = {
      ...orders[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    return orders[index];
  }
  return null;
}

// Delete order
export function deleteOrder(id) {
  const index = orders.findIndex(o => o.id === id);
  if (index !== -1) {
    orders.splice(index, 1);
    return true;
  }
  return false;
}

// Get order statistics
export function getOrderStats() {
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    processing: orders.filter(o => o.status === 'processing').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
    totalRevenue: orders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, order) => sum + (order.total || 0), 0)
  };
  
  return stats;
}

// Get order statistics for product orders only
export function getProductOrderStats() {
  const productOrders = getProductOrders();
  const stats = {
    total: productOrders.length,
    pending: productOrders.filter(o => o.status === 'pending').length,
    processing: productOrders.filter(o => o.status === 'processing').length,
    shipped: productOrders.filter(o => o.status === 'shipped').length,
    delivered: productOrders.filter(o => o.status === 'delivered').length,
    cancelled: productOrders.filter(o => o.status === 'cancelled').length,
    totalRevenue: productOrders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, order) => sum + (order.total || 0), 0)
  };
  
  return stats;
}

// Get order statistics for player registration orders only
export function getPlayerRegistrationStats() {
  const playerOrders = getPlayerRegistrationOrders();
  const stats = {
    total: playerOrders.length,
    pending: playerOrders.filter(o => o.status === 'pending').length,
    processing: playerOrders.filter(o => o.status === 'processing').length,
    shipped: playerOrders.filter(o => o.status === 'shipped').length,
    delivered: playerOrders.filter(o => o.status === 'delivered').length,
    cancelled: playerOrders.filter(o => o.status === 'cancelled').length,
    totalRevenue: playerOrders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, order) => sum + (order.total || 0), 0)
  };
  
  return stats;
}

// Get order statistics for team registration orders only
export function getTeamRegistrationStats() {
  const teamOrders = getTeamRegistrationOrders();
  const stats = {
    total: teamOrders.length,
    pending: teamOrders.filter(o => o.status === 'pending').length,
    processing: teamOrders.filter(o => o.status === 'processing').length,
    shipped: teamOrders.filter(o => o.status === 'shipped').length,
    delivered: teamOrders.filter(o => o.status === 'delivered').length,
    cancelled: teamOrders.filter(o => o.status === 'cancelled').length,
    totalRevenue: teamOrders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, order) => sum + (order.total || 0), 0)
  };
  
  return stats;
}

// Add tracking info to order
export function addTrackingInfo(id, trackingNumber, courier) {
  const order = getOrderById(id);
  if (order) {
    order.tracking = {
      number: trackingNumber,
      courier,
      addedAt: new Date().toISOString()
    };
    order.updatedAt = new Date().toISOString();
    return order;
  }
  return null;
}

// Sample orders for testing
orders = [
  {
    id: 1000,
    orderNumber: 'WLC-1000',
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    customerPhone: '0821234567',
    items: [
      { id: 1, name: 'Premium Jersey', quantity: 2, price: 599, size: 'Large' },
      { id: 2, name: 'Cricket Bat', quantity: 1, price: 1299 }
    ],
    subtotal: 2497,
    shipping: 100,
    total: 2597,
    status: 'pending',
    paymentMethod: 'PayFast',
    paymentStatus: 'paid',
    shippingAddress: {
      street: '123 Main Street',
      city: 'Cape Town',
      province: 'Western Cape',
      postalCode: '8001'
    },
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    statusHistory: [
      {
        status: 'pending',
        notes: 'Order placed',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      }
    ]
  },
  {
    id: 1001,
    orderNumber: 'WLC-1001',
    customerName: 'Jane Smith',
    customerEmail: 'jane@example.com',
    customerPhone: '0829876543',
    items: [
      { id: 3, name: 'Training Kit', quantity: 1, price: 899, size: 'Medium' }
    ],
    subtotal: 899,
    shipping: 100,
    total: 999,
    status: 'processing',
    paymentMethod: 'PayFast',
    paymentStatus: 'paid',
    shippingAddress: {
      street: '456 High Road',
      city: 'Johannesburg',
      province: 'Gauteng',
      postalCode: '2000'
    },
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    statusHistory: [
      {
        status: 'pending',
        notes: 'Order placed',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      },
      {
        status: 'processing',
        notes: 'Payment confirmed, preparing for shipment',
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
      }
    ]
  }
];

orderIdCounter = 1002;
