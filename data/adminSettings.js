// Admin settings and email template storage
import fs from 'fs';
import path from 'path';

const ADMIN_SETTINGS_FILE = path.join(process.cwd(), 'data', 'adminSettings.json');

// Load settings from file if it exists
function loadSettings() {
  try {
    if (fs.existsSync(ADMIN_SETTINGS_FILE)) {
      const data = fs.readFileSync(ADMIN_SETTINGS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading admin settings:', error);
  }
  return null;
}

// Save settings to file
function saveSettings(settings) {
  try {
    fs.writeFileSync(ADMIN_SETTINGS_FILE, JSON.stringify(settings, null, 2));
  } catch (error) {
    console.error('Error saving admin settings:', error);
  }
}

const defaultSettings = {
  email: 'admin@cricketleague.com',
  password: '', // In production, this should be hashed
  supplierEmail: 'supplier@example.com', // Email address to forward product orders
  teamPortalTemplate: {
    title: 'WL Team Portal',
    subtitle: 'Manage your team, players, fixtures, and revenue',
    headerStart: '#000000',
    headerEnd: '#dc0000'
  },
  emailTemplates: {
    pending: {
      subject: 'Registration Received - {teamName}',
      body: `Dear {coachName},

Thank you for submitting your team registration for {teamName}.

We have received your registration and it is currently being reviewed by our admin team.

Registration ID: #{registrationId}
Status: Pending Review

You will receive another email once your registration has been reviewed.

If you have any questions, please don't hesitate to contact us.

Best regards,
Cricket League Administration`
    },
    reviewed: {
      subject: 'Registration Under Review - {teamName}',
      body: `Dear {coachName},

Your team registration for {teamName} is currently under review.

Registration ID: #{registrationId}
Status: Under Review

Our team is reviewing your submission and may contact you if any additional information is required.

You will receive a final confirmation email once the review is complete.

Best regards,
Cricket League Administration`
    },
    complete: {
      subject: 'Registration Approved - {teamName}',
      body: `Dear {coachName},

Congratulations! Your team registration for {teamName} has been approved.

Registration ID: #{registrationId}
Status: Complete

Your team is now officially registered for the season. You will receive additional information about schedules, fixtures, and next steps shortly.

Welcome to the league!

Best regards,
Cricket League Administration`
    },
    orderConfirmation: {
      subject: 'Order Confirmation - #{orderNumber}',
      body: `Dear {customerName},

Thank you for your order!

Order Number: #{orderNumber}
Order Date: {orderDate}
Total Amount: R{totalAmount}

Order Details:
{orderItems}

Shipping Address:
{shippingAddress}

Your order has been received and is being processed. You will receive another email once your order has been shipped.

If you have any questions about your order, please contact us.

Best regards,
Cricket League Shop`
    },
    supplierForward: {
      subject: 'New Product Order - #{orderNumber}',
      body: `New product order received:

Order Number: #{orderNumber}
Order Date: {orderDate}
Total Amount: R{totalAmount}

Customer Information:
Name: {customerName}
Email: {customerEmail}
Phone: {customerPhone}

Order Details:
{orderItems}

Shipping Address:
{shippingAddress}

Please process this order at your earliest convenience.`
    },
    payoutRequest: {
      subject: 'New Payout Request - {teamName}',
      body: `A new payout request has been submitted:

Team: {teamName}
Coach: {coachName}
Email: {email}
Phone: {phone}

Request ID: #{requestId}
Total Amount: R{amount}

Breakdown:
- Player Registration Markup: R{markup}
- Product Commission (10%): R{commission}

Request Date: {requestDate}

Please review and process this payout request in the admin panel.

Admin Panel Link: {adminLink}/admin/payouts`
    },
    parentPaymentSuccess: {
      subject: 'Payment Received - Player Registration for {playerName}',
      body: `Dear {parentName},

Thank you for your payment! We have successfully received your player registration payment.

Order Number: #{orderNumber}
Total Amount: R{totalAmount}
Player: {playerName}
Team: {teamName}

Your registration is now being reviewed by our admin team. You will receive another email once your player has been approved.

You can log in to the Parent Portal to track the status of your registration:

Login Link: {loginUrl}
Email: {email}
Password: {password}

If you have any questions, please don't hesitate to contact us.

Best regards,
Winter League Cricket`
    },
    parentPlayerApproved: {
      subject: 'Player Approved - {playerName} for {teamName}',
      body: `Dear {parentName},

Great news! Your player registration for {playerName} has been approved.

Player: {playerName}
Team: {teamName}
Status: Approved

Your player is now officially registered for the season. You can view all details and updates in the Parent Portal:

Login Link: {loginUrl}
Email: {email}
Password: {password}

You will receive additional information about schedules, fixtures, and next steps shortly.

Welcome to the league!

Best regards,
Winter League Cricket`
    }
  }
};

function mergeSettings(loaded) {
  const merged = {
    ...defaultSettings,
    ...(loaded || {}),
    teamPortalTemplate: {
      ...defaultSettings.teamPortalTemplate,
      ...(loaded?.teamPortalTemplate || {})
    },
    emailTemplates: {
      ...defaultSettings.emailTemplates,
      ...(loaded?.emailTemplates || {})
    }
  };

  return merged;
}

// Initialize adminSettings from file or use defaults
let adminSettings = mergeSettings(loadSettings());

// Admin Settings Functions
export function getAdminSettings() {
  // Reload from file to get latest
  const loaded = loadSettings();
  if (loaded) {
    adminSettings = mergeSettings(loaded);
  }
  return adminSettings;
}

export function updateAdminEmail(email) {
  adminSettings.email = email;
  saveSettings(mergeSettings(adminSettings));
  return adminSettings;
}

export function updateAdminPassword(password) {
  // In production, hash the password before storing
  adminSettings.password = password;
  saveSettings(mergeSettings(adminSettings));
  return adminSettings;
}

export function updateSupplierEmail(email) {
  adminSettings.supplierEmail = email;
  saveSettings(mergeSettings(adminSettings));
  return adminSettings;
}

export function getEmailTemplate(status) {
  const settings = getAdminSettings();
  return settings?.emailTemplates?.[status] || null;
}

export function updateEmailTemplate(status, template) {
  if (!adminSettings.emailTemplates) {
    adminSettings.emailTemplates = { ...defaultSettings.emailTemplates };
  }
  // Update existing template or create new one
  adminSettings.emailTemplates[status] = {
    ...(adminSettings.emailTemplates[status] || {}),
    ...template
  };
  saveSettings(mergeSettings(adminSettings));
  return adminSettings.emailTemplates[status];
}

export function updateAllAdminSettings(settings) {
  adminSettings = mergeSettings({
    ...adminSettings,
    ...settings
  });
  saveSettings(adminSettings);
  return adminSettings;
}
