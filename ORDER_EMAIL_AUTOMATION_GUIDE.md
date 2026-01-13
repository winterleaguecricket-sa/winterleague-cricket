# Product Order Email Automation Guide

## Overview
The system automatically sends emails when customers place product orders (excludes player registration and team registration orders). Two emails are sent:
1. **Customer Confirmation Email** - Sent to the customer
2. **Supplier Forward Email** - Sent to the configured supplier for order fulfillment

## Configuration

### 1. Access Admin Settings
Navigate to: **Admin Panel → Admin Settings → Order Emails Tab**

### 2. Configure Supplier Email
- Set the email address where all product orders should be forwarded
- This is typically your supplier or fulfillment center
- Click "Save" to update the supplier email

### 3. Customize Email Templates

#### Customer Confirmation Email
This email is sent to customers when they place an order.

**Available Variables:**
- `{orderNumber}` - The order number (e.g., ORD1234567890)
- `{orderDate}` - Date the order was placed
- `{customerName}` - Customer's full name
- `{totalAmount}` - Total order amount
- `{orderItems}` - Formatted list of ordered items
- `{shippingAddress}` - Customer's shipping address

**Default Template:**
```
Subject: Order Confirmation - #{orderNumber}

Dear {customerName},

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
Cricket League Shop
```

#### Supplier Forward Email
This email is forwarded to the supplier for order fulfillment.

**Available Variables:**
- `{orderNumber}` - The order number
- `{orderDate}` - Date the order was placed
- `{customerName}` - Customer's full name
- `{customerEmail}` - Customer's email address
- `{customerPhone}` - Customer's phone number
- `{totalAmount}` - Total order amount
- `{orderItems}` - Formatted list of ordered items
- `{shippingAddress}` - Customer's shipping address

**Default Template:**
```
Subject: New Product Order - #{orderNumber}

New product order received:

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

Please process this order at your earliest convenience.
```

## How It Works

### Automatic Trigger
Emails are automatically sent when:
1. A customer completes checkout for **product orders only**
2. Order is created in the system
3. System checks if order type is NOT player-registration or team-registration
4. Both customer and supplier emails are sent simultaneously

### Email Flow
```
Customer Places Order
        ↓
Order Created in System
        ↓
Check Order Type
        ↓
    Product Order? ──→ YES ──→ Send Emails:
        |                      • Customer confirmation
        |                      • Supplier forward
        ↓
    Registration Order? ──→ YES ──→ Skip (No emails sent)
```

## Email Service Integration

### Development Mode (Current)
- Emails are logged to the console
- Check browser console and server logs to see email content
- No actual emails are sent

### Production Setup
To enable actual email sending, update `/pages/api/send-order-email.js`:

#### Option 1: Nodemailer (SMTP)
```javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

// Send emails
await transporter.sendMail({
  from: process.env.SMTP_FROM_EMAIL,
  to: customerEmail,
  subject: customerEmailData.subject,
  text: customerEmailData.body
});
```

#### Option 2: SendGrid
```javascript
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

await sgMail.send({
  to: customerEmail,
  from: process.env.SENDGRID_FROM_EMAIL,
  subject: customerEmailData.subject,
  text: customerEmailData.body
});
```

### Environment Variables
Add these to your `.env.local` file:

```env
# For Nodemailer
SMTP_HOST=smtp.example.com
SMTP_PORT=465
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-password
SMTP_FROM_EMAIL=noreply@cricketleague.com

# For SendGrid
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@cricketleague.com
```

## Testing

### 1. Test in Development
1. Place a test product order
2. Check browser console (F12 → Console tab)
3. Check terminal/server logs
4. Verify email content in logs

### 2. View Email Templates
1. Go to Admin Panel → Admin Settings
2. Click "Order Emails" tab
3. Toggle between "Customer Confirmation" and "Supplier Forward"
4. Preview and edit templates

### 3. Test Variables
Ensure all variables are replaced correctly:
- Order number displays properly
- Customer information is complete
- Order items are formatted clearly
- Shipping address is readable

## Troubleshooting

### Emails Not Sending
- Check that order type is NOT 'player-registration' or 'team-registration'
- Verify supplier email is configured in admin settings
- Check browser console for errors
- Check server logs for API errors

### Template Variables Not Replacing
- Ensure variable names match exactly (case-sensitive)
- Verify order data contains required fields
- Check template syntax in admin panel

### Missing Customer Information
- Ensure customer profile is complete before checkout
- Verify shipping address is saved
- Check that all required fields are filled

## Order Types

### Product Orders (Emails Sent)
- Regular product purchases
- Store items
- Merchandise
- Equipment

### Registration Orders (No Emails)
- Player registrations (orderType: 'player-registration')
- Team registrations (orderType: 'team-registration')
- These use separate form submission approval system

## Best Practices

1. **Keep Templates Professional** - Use clear, friendly language
2. **Test Thoroughly** - Always test after template changes
3. **Update Supplier Email** - Keep supplier email current
4. **Monitor Logs** - Check logs regularly in development
5. **Set Up Production Emails** - Configure real email service before going live
6. **Backup Templates** - Save copies of customized templates
7. **Use Variables** - Leverage all available variables for personalization

## Admin Panel Access

**Location:** Admin Panel → Admin Settings → Order Emails Tab

**Features:**
- Configure supplier email address
- Edit customer confirmation template
- Edit supplier forward template
- Preview template variables
- Save changes immediately

## Support

For issues or questions:
1. Check server logs for errors
2. Verify API endpoint is working: `/api/send-order-email`
3. Test with sample orders in development
4. Review template syntax and variables
