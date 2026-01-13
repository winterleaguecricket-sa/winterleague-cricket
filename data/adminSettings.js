// Admin settings and email template storage

let adminSettings = {
  email: 'admin@cricketleague.com',
  password: '', // In production, this should be hashed
  supplierEmail: 'supplier@example.com', // Email address to forward product orders
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
    }
  }
};

// Admin Settings Functions
export function getAdminSettings() {
  return adminSettings;
}

export function updateAdminEmail(email) {
  adminSettings.email = email;
  return adminSettings;
}

export function updateAdminPassword(password) {
  // In production, hash the password before storing
  adminSettings.password = password;
  return adminSettings;
}

export function updateSupplierEmail(email) {
  adminSettings.supplierEmail = email;
  return adminSettings;
}

export function getEmailTemplate(status) {
  return adminSettings.emailTemplates[status] || null;
}

export function updateEmailTemplate(status, template) {
  if (adminSettings.emailTemplates[status]) {
    adminSettings.emailTemplates[status] = {
      ...adminSettings.emailTemplates[status],
      ...template
    };
    return adminSettings.emailTemplates[status];
  }
  return null;
}

export function updateAllAdminSettings(settings) {
  adminSettings = {
    ...adminSettings,
    ...settings
  };
  return adminSettings;
}
