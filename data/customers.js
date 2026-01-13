// Customer profiles data
import { getAdminSettings, getEmailTemplate } from './adminSettings';

let customerProfiles = [
  {
    id: 1,
    email: 'john@example.com',
    password: 'password123',
    firstName: 'John',
    lastName: 'Doe',
    phone: '0821234567',
    idNumber: '',
    dateOfBirth: '',
    company: '',
    teamId: null, // Link to team profile for commission tracking
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    orders: [],
    shippingAddress: {
      address: '123 Main Street',
      address2: '',
      city: 'Cape Town',
      province: 'Western Cape',
      postalCode: '8001',
      country: 'South Africa'
    }
  },
  {
    id: 2,
    email: 'jane@example.com',
    password: 'password123',
    firstName: 'Jane',
    lastName: 'Smith',
    phone: '0829876543',
    idNumber: '',
    dateOfBirth: '',
    company: '',
    teamId: null, // Link to team profile for commission tracking
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    orders: [],
    shippingAddress: {
      address: '456 High Road',
      address2: '',
      city: 'Johannesburg',
      province: 'Gauteng',
      postalCode: '2000',
      country: 'South Africa'
    }
  }
];
let profileIdCounter = 3;

// Verification codes storage (email -> {code, expiresAt})
let verificationCodes = {};

// Get all customer profiles
export function getAllProfiles() {
  return customerProfiles;
}

// Get profile by ID
export function getProfileById(id) {
  return customerProfiles.find(profile => profile.id === id);
}

// Get profile by email
export function getProfileByEmail(email) {
  return customerProfiles.find(profile => profile.email.toLowerCase() === email.toLowerCase());
}

// Verify customer credentials for login
export function verifyCredentials(email, password) {
  const profile = customerProfiles.find(p => p.email.toLowerCase() === email.toLowerCase());
  if (!profile) {
    return { error: 'Invalid email or password', authenticated: false };
  }
  
  if (profile.password !== password) {
    return { error: 'Invalid email or password', authenticated: false };
  }
  
  // Return profile without password
  const { password: _, ...profileWithoutPassword } = profile;
  return { authenticated: true, profile: profileWithoutPassword };
}

// Reset password for customer
export function resetPassword(email, newPassword, verificationCode) {
  const profile = customerProfiles.find(p => p.email.toLowerCase() === email.toLowerCase());
  if (!profile) {
    return { error: 'No account found with this email address', success: false };
  }
  
  // Verify the code
  if (!verifyResetCode(email, verificationCode)) {
    return { error: 'Invalid or expired verification code', success: false };
  }
  
  if (!newPassword || newPassword.length < 6) {
    return { error: 'Password must be at least 6 characters long', success: false };
  }
  
  profile.password = newPassword;
  profile.updatedAt = new Date().toISOString();
  
  // Clear the verification code
  delete verificationCodes[email.toLowerCase()];
  
  return { success: true, message: 'Password has been reset successfully' };
}

// Generate verification code for password reset
export function generateResetCode(email) {
  const profile = customerProfiles.find(p => p.email.toLowerCase() === email.toLowerCase());
  if (!profile) {
    return { error: 'No account found with this email address', success: false };
  }
  
  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Store code with 15-minute expiration
  const expiresAt = Date.now() + (15 * 60 * 1000);
  verificationCodes[email.toLowerCase()] = { code, expiresAt };
  
  // In production, send this code via email
  // For demo purposes, we'll log it to console
  console.log(`🔐 Password Reset Code for ${email}: ${code} (Valid for 15 minutes)`);
  
  return { 
    success: true, 
    code, // Only for demo - remove in production
    message: `Verification code sent to ${email}`,
    expiresAt 
  };
}

// Verify reset code
export function verifyResetCode(email, code) {
  const stored = verificationCodes[email.toLowerCase()];
  
  if (!stored) {
    return false;
  }
  
  if (Date.now() > stored.expiresAt) {
    delete verificationCodes[email.toLowerCase()];
    return false;
  }
  
  return stored.code === code;
}

// Create new customer profile
export function createProfile(profileData) {
  const existingProfile = getProfileByEmail(profileData.email);
  if (existingProfile) {
    return { error: 'Email already exists', profile: existingProfile };
  }

  if (!profileData.password) {
    return { error: 'Password is required' };
  }

  const newProfile = {
    id: profileIdCounter++,
    ...profileData,
    password: profileData.password, // In production, this should be hashed
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    orders: []
  };

  customerProfiles.push(newProfile);
  return { profile: newProfile };
}

// Update customer profile
export function updateProfile(id, updates) {
  const index = customerProfiles.findIndex(p => p.id === id);
  if (index !== -1) {
    customerProfiles[index] = {
      ...customerProfiles[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    return customerProfiles[index];
  }
  return null;
}

// Delete customer profile
export function deleteProfile(id) {
  const index = customerProfiles.findIndex(p => p.id === id);
  if (index !== -1) {
    customerProfiles.splice(index, 1);
    return true;
  }
  return false;
}

// Add order to profile
export function addOrderToProfile(profileId, orderData) {
  const profile = getProfileById(profileId);
  if (profile) {
    const order = {
      id: Date.now(),
      ...orderData,
      createdAt: new Date().toISOString()
    };
    profile.orders.push(order);
    profile.updatedAt = new Date().toISOString();
    
    // Send automated emails for product orders (not registration orders)
    sendOrderEmailsForProfile(order, profile);
    
    return order;
  }
  return null;
}

// Helper function to send order emails
async function sendOrderEmailsForProfile(order, profile) {
  try {
    // Only send emails for product orders (not registration orders)
    if (order.orderType === 'player-registration' || order.orderType === 'team-registration') {
      return;
    }

    const settings = getAdminSettings();
    const customerTemplate = getEmailTemplate('orderConfirmation');
    const supplierTemplate = getEmailTemplate('supplierForward');

    if (!customerTemplate || !supplierTemplate) {
      console.error('Order email templates not found');
      return;
    }

    // Format order items for email
    const orderItemsText = order.items.map(item => 
      `- ${item.name || item.productName} x${item.quantity}${item.size ? ` (${item.size})` : ''} - R${(item.price * item.quantity).toFixed(2)}`
    ).join('\n');

    // Format shipping address
    const shippingAddress = order.shippingAddress || profile.shippingAddress;
    const shippingAddressText = `${shippingAddress.address}
${shippingAddress.city}, ${shippingAddress.province}
${shippingAddress.postalCode}`;

    // Prepare customer email data
    const customerEmailData = {
      subject: customerTemplate.subject
        .replace('{orderNumber}', order.orderId),
      body: customerTemplate.body
        .replace('{customerName}', `${profile.firstName} ${profile.lastName}`)
        .replace('{orderNumber}', order.orderId)
        .replace('{orderDate}', new Date(order.createdAt).toLocaleDateString())
        .replace('{totalAmount}', order.total.toFixed(2))
        .replace('{orderItems}', orderItemsText)
        .replace('{shippingAddress}', shippingAddressText)
    };

    // Prepare supplier email data
    const supplierEmailData = {
      subject: supplierTemplate.subject
        .replace('{orderNumber}', order.orderId),
      body: supplierTemplate.body
        .replace('{orderNumber}', order.orderId)
        .replace('{orderDate}', new Date(order.createdAt).toLocaleDateString())
        .replace('{totalAmount}', order.total.toFixed(2))
        .replace('{customerName}', `${profile.firstName} ${profile.lastName}`)
        .replace('{customerEmail}', profile.email)
        .replace('{customerPhone}', profile.phone || 'N/A')
        .replace('{orderItems}', orderItemsText)
        .replace('{shippingAddress}', shippingAddressText)
    };

    // Send emails via API
    await fetch('/api/send-order-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerEmail: profile.email,
        supplierEmail: settings.supplierEmail,
        customerEmailData,
        supplierEmailData
      })
    });

    console.log(`Order emails sent for ${order.orderId}`);
  } catch (error) {
    console.error('Error sending order emails:', error);
  }
}

// Get profile orders
export function getProfileOrders(profileId) {
  const profile = getProfileById(profileId);
  return profile ? profile.orders : [];
}
