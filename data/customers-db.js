// Customer profiles - PostgreSQL backed
// All functions are async and use the database
import { query } from '../lib/db';

// Helper to convert DB row to app profile format
function rowToProfile(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    password: row.password_hash || '',
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    phone: row.phone || '',
    idNumber: row.id_number || '',
    dateOfBirth: row.date_of_birth || '',
    company: row.company || '',
    teamId: row.team_id || null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
    shippingAddress: {
      address: row.address || '',
      address2: row.shipping_address2 || '',
      city: row.city || '',
      province: row.shipping_province || '',
      postalCode: row.postal_code || '',
      country: row.country || 'South Africa'
    }
  };
}

// Get all customer profiles
export async function getAllProfiles() {
  const result = await query('SELECT * FROM customers ORDER BY created_at DESC');
  return result.rows.map(rowToProfile);
}

// Get profile by ID
export async function getProfileById(id) {
  const result = await query('SELECT * FROM customers WHERE id = $1', [id]);
  return rowToProfile(result.rows[0]);
}

// Get profile by email
export async function getProfileByEmail(email) {
  if (!email) return null;
  const result = await query(
    'SELECT * FROM customers WHERE LOWER(email) = LOWER($1)',
    [email.trim()]
  );
  return rowToProfile(result.rows[0]);
}

// Verify customer credentials for login
export async function verifyCredentials(email, password) {
  const profile = await getProfileByEmail(email);
  if (!profile) {
    return { error: 'Invalid email or password', authenticated: false };
  }

  if (profile.password !== password) {
    return { error: 'Invalid email or password', authenticated: false };
  }

  // Update last_login
  await query('UPDATE customers SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [profile.id]);

  const { password: _, ...profileWithoutPassword } = profile;
  return { authenticated: true, profile: profileWithoutPassword };
}

// Reset password for customer
export async function resetPassword(email, newPassword, verificationCode) {
  const profile = await getProfileByEmail(email);
  if (!profile) {
    return { error: 'No account found with this email address', success: false };
  }

  // Verify the code (still in-memory since codes are short-lived by design)
  if (!verifyResetCode(email, verificationCode)) {
    return { error: 'Invalid or expired verification code', success: false };
  }

  if (!newPassword || newPassword.length < 6) {
    return { error: 'Password must be at least 6 characters long', success: false };
  }

  await query(
    'UPDATE customers SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [newPassword, profile.id]
  );

  // Clear the verification code
  delete verificationCodes[email.toLowerCase()];

  return { success: true, message: 'Password has been reset successfully' };
}

// Verification codes storage (short-lived, in-memory is appropriate)
let verificationCodes = {};

// Generate verification code for password reset
export async function generateResetCode(email) {
  const profile = await getProfileByEmail(email);
  if (!profile) {
    return { error: 'No account found with this email address', success: false };
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + (15 * 60 * 1000);
  verificationCodes[email.toLowerCase()] = { code, expiresAt };

  console.log(`🔐 Password Reset Code for ${email}: ${code} (Valid for 15 minutes)`);

  return {
    success: true,
    code,
    message: `Verification code sent to ${email}`,
    expiresAt
  };
}

// Verify reset code (synchronous - codes are in-memory by design)
export function verifyResetCode(email, code) {
  const stored = verificationCodes[email.toLowerCase()];
  if (!stored) return false;
  if (Date.now() > stored.expiresAt) {
    delete verificationCodes[email.toLowerCase()];
    return false;
  }
  return stored.code === code;
}

// Create new customer profile
export async function createProfile(profileData) {
  const existing = await getProfileByEmail(profileData.email);
  if (existing) {
    return { error: 'Email already exists', profile: existing };
  }

  if (!profileData.password) {
    return { error: 'Password is required' };
  }

  const result = await query(
    `INSERT INTO customers (
      id, email, password_hash, first_name, last_name, phone,
      id_number, date_of_birth, company, team_id,
      address, shipping_address2, city, shipping_province, postal_code, country,
      created_at, updated_at
    ) VALUES (
      uuid_generate_v4(), $1, $2, $3, $4, $5,
      $6, $7, $8, $9,
      $10, $11, $12, $13, $14, $15,
      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ) RETURNING *`,
    [
      profileData.email,
      profileData.password,
      profileData.firstName || '',
      profileData.lastName || '',
      profileData.phone || '',
      profileData.idNumber || '',
      profileData.dateOfBirth || '',
      profileData.company || '',
      profileData.teamId || null,
      profileData.shippingAddress?.address || '',
      profileData.shippingAddress?.address2 || '',
      profileData.shippingAddress?.city || '',
      profileData.shippingAddress?.province || '',
      profileData.shippingAddress?.postalCode || '',
      profileData.shippingAddress?.country || 'South Africa'
    ]
  );

  return { profile: rowToProfile(result.rows[0]) };
}

// Update customer profile
export async function updateProfile(id, updates) {
  const setClauses = [];
  const values = [];
  let paramIndex = 1;

  const fieldMap = {
    email: 'email',
    password: 'password_hash',
    firstName: 'first_name',
    lastName: 'last_name',
    phone: 'phone',
    idNumber: 'id_number',
    dateOfBirth: 'date_of_birth',
    company: 'company',
    teamId: 'team_id'
  };

  for (const [appKey, dbCol] of Object.entries(fieldMap)) {
    if (updates[appKey] !== undefined) {
      setClauses.push(`${dbCol} = $${paramIndex}`);
      values.push(updates[appKey]);
      paramIndex++;
    }
  }

  // Handle nested shipping address
  if (updates.shippingAddress) {
    const sa = updates.shippingAddress;
    if (sa.address !== undefined) { setClauses.push(`address = $${paramIndex}`); values.push(sa.address); paramIndex++; }
    if (sa.address2 !== undefined) { setClauses.push(`shipping_address2 = $${paramIndex}`); values.push(sa.address2); paramIndex++; }
    if (sa.city !== undefined) { setClauses.push(`city = $${paramIndex}`); values.push(sa.city); paramIndex++; }
    if (sa.province !== undefined) { setClauses.push(`shipping_province = $${paramIndex}`); values.push(sa.province); paramIndex++; }
    if (sa.postalCode !== undefined) { setClauses.push(`postal_code = $${paramIndex}`); values.push(sa.postalCode); paramIndex++; }
    if (sa.country !== undefined) { setClauses.push(`country = $${paramIndex}`); values.push(sa.country); paramIndex++; }
  }

  if (setClauses.length === 0) return null;

  values.push(id);
  const result = await query(
    `UPDATE customers SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  return rowToProfile(result.rows[0]);
}

// Delete customer profile
export async function deleteProfile(id) {
  // Nullify customer_id on any linked orders first to avoid FK violation
  await query('UPDATE orders SET customer_id = NULL WHERE customer_id = $1', [id]);
  const result = await query('DELETE FROM customers WHERE id = $1', [id]);
  return result.rowCount > 0;
}

// Get profile orders from the orders table
export async function getProfileOrders(profileId) {
  const result = await query(
    'SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC',
    [profileId]
  );
  // Return in app format
  return result.rows.map(row => ({
    id: row.id,
    orderId: row.order_number,
    orderNumber: row.order_number,
    items: row.items || [],
    total: parseFloat(row.total_amount) || 0,
    subtotal: parseFloat(row.subtotal) || 0,
    shipping: parseFloat(row.shipping_cost) || 0,
    status: row.status || 'pending',
    paymentMethod: row.payment_method || '',
    paymentStatus: row.payment_status || 'pending',
    orderType: row.order_type || 'product',
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : '',
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : ''
  }));
}

// Add order to profile (creates in orders table)
export async function addOrderToProfile(profileId, orderData) {
  const orderNumber = orderData.orderId || `WLC-${Date.now()}`;

  const result = await query(
    `INSERT INTO orders (
      id, order_number, customer_id, customer_email, customer_name, customer_phone,
      items, subtotal, shipping_cost, total_amount,
      status, payment_method, payment_status, order_type,
      shipping_address, shipping_city, shipping_province, shipping_postal_code,
      status_history, created_at, updated_at
    ) VALUES (
      uuid_generate_v4(), $1, $2,
      (SELECT email FROM customers WHERE id = $3),
      (SELECT CONCAT(first_name, ' ', last_name) FROM customers WHERE id = $4),
      (SELECT phone FROM customers WHERE id = $5),
      $6, $7, $8, $9,
      $10, $11, $12, $13,
      $14, $15, $16, $17,
      $18, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ) RETURNING *`,
    [
      orderNumber,
      profileId,
      profileId,
      profileId,
      profileId,
      JSON.stringify(orderData.items || []),
      orderData.subtotal || orderData.total || 0,
      orderData.shipping || 0,
      orderData.total || 0,
      orderData.status || 'pending',
      orderData.paymentMethod || 'payfast',
      orderData.paymentStatus || 'pending',
      orderData.orderType || 'product',
      orderData.shippingAddress?.street || orderData.shippingAddress?.address || '',
      orderData.shippingAddress?.city || '',
      orderData.shippingAddress?.province || '',
      orderData.shippingAddress?.postalCode || '',
      JSON.stringify([{ status: 'pending', notes: 'Order placed', timestamp: new Date().toISOString() }])
    ]
  );

  const row = result.rows[0];
  return {
    id: row.id,
    orderId: row.order_number,
    orderNumber: row.order_number,
    items: row.items || [],
    total: parseFloat(row.total_amount) || 0,
    status: row.status,
    createdAt: new Date(row.created_at).toISOString()
  };
}
