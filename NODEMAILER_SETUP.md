# Nodemailer Setup Guide

## ✅ Installation Complete

Nodemailer has been installed and configured. The system will automatically send real emails when SMTP credentials are provided.

## 📧 Email Provider Setup

### Option 1: Gmail (Recommended for Testing)

1. **Enable 2-Step Verification** (if not already enabled)
   - Go to: https://myaccount.google.com/security
   - Enable "2-Step Verification"

2. **Create App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Select app: "Mail"
   - Select device: "Other (Custom name)" → Enter "Cricket League"
   - Click "Generate"
   - Copy the 16-character password (remove spaces)

3. **Update `.env.local` file**
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-16-char-app-password
   SMTP_FROM_EMAIL=your-email@gmail.com
   SMTP_FROM_NAME=Cricket League Shop
   ```

### Option 2: Outlook/Hotmail

```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-password
SMTP_FROM_EMAIL=your-email@outlook.com
SMTP_FROM_NAME=Cricket League Shop
```

### Option 3: Custom SMTP Server

```env
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=465
SMTP_USER=noreply@yourdomain.com
SMTP_PASSWORD=your-password
SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_FROM_NAME=Cricket League Shop
```

### Option 4: Professional Email Services

#### SendGrid
- Free tier: 100 emails/day
- Sign up: https://sendgrid.com
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=465
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_FROM_NAME=Cricket League Shop
```

#### Mailgun
- Sign up: https://mailgun.com
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=465
SMTP_USER=postmaster@yourdomain.com
SMTP_PASSWORD=your-mailgun-password
SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_FROM_NAME=Cricket League Shop
```

## 🔧 Configuration

### 1. Edit Environment Variables

Open `/workspaces/codespaces-nextjs/.env.local` and update:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-actual-email@gmail.com
SMTP_PASSWORD=your-app-password-here
SMTP_FROM_EMAIL=your-actual-email@gmail.com
SMTP_FROM_NAME=Cricket League Shop
```

### 2. Restart Development Server

After updating `.env.local`:

```bash
# Stop the server (Ctrl+C)
# Start it again
npm run dev
```

## 🧪 Testing

### Test Order Email Flow

1. **Place a test order** in your app
2. **Check terminal/console** for email status:
   - Success: "Customer email sent: <message-id>"
   - Success: "Supplier email sent: <message-id>"
   - Error: Shows specific error message

3. **Check email inbox** for both:
   - Customer confirmation email
   - Supplier forward email

### Manual API Test

You can test the API directly:

```bash
curl -X POST http://localhost:3000/api/send-order-email \
  -H "Content-Type: application/json" \
  -d '{
    "customerEmail": "test@example.com",
    "supplierEmail": "supplier@example.com",
    "customerEmailData": {
      "subject": "Test Order Confirmation",
      "body": "This is a test email"
    },
    "supplierEmailData": {
      "subject": "Test Supplier Forward",
      "body": "This is a test supplier email"
    }
  }'
```

## 🔍 How It Works

### Automatic Detection
- **Without SMTP Config**: Logs to console (development mode)
- **With SMTP Config**: Sends real emails via Nodemailer

### Email Flow
```
Order Created
    ↓
Check SMTP Config
    ↓
├─ Not Configured ──→ Log to Console (Dev Mode)
│
└─ Configured ──→ Send Real Emails:
                  • Verify SMTP connection
                  • Send customer email
                  • Send supplier email
                  • Return success/failure
```

## 🚨 Troubleshooting

### "Authentication Failed"
- **Gmail**: Use App Password, not regular password
- **Outlook**: Enable "Less secure app access"
- **Custom**: Verify username/password are correct

### "Connection Timeout"
- Check SMTP_HOST is correct
- Try different port (465 or 587)
- Check firewall/network settings

### "Invalid Login"
- Verify SMTP_USER is complete email address
- Check for typos in credentials
- Ensure account is active

### Emails Going to Spam
- Add SPF/DKIM records to your domain
- Use professional email service (SendGrid, Mailgun)
- Avoid spam trigger words in templates
- Test with different email providers

### "Self-signed Certificate" Error
Add to transporter config:
```javascript
tls: {
  rejectUnauthorized: false
}
```

## 🔒 Security Best Practices

1. **Never commit `.env.local`** - Already in `.gitignore`
2. **Use App Passwords** - Not your main account password
3. **Rotate credentials** - Change periodically
4. **Monitor usage** - Check for unusual activity
5. **Rate limiting** - Consider adding rate limits to API

## 📊 Current Implementation

### Files Updated:
- ✅ `/pages/api/send-order-email.js` - Now uses Nodemailer
- ✅ `/.env.local` - Created with SMTP variables
- ✅ `package.json` - Nodemailer dependency added

### Features:
- ✅ Automatic fallback to console logging if not configured
- ✅ SMTP connection verification
- ✅ HTML email support (converts line breaks)
- ✅ Custom sender name and email
- ✅ Error handling and logging
- ✅ Success/failure response

## 🎯 Next Steps

1. **Update `.env.local`** with your real SMTP credentials
2. **Restart dev server** to load new environment variables
3. **Test with a real order** to verify emails send correctly
4. **Customize email templates** in Admin Panel → Order Emails
5. **Set supplier email** in Admin Settings

## 📝 Email Limits

### Gmail
- Free: 500 emails/day
- Google Workspace: 2000 emails/day

### Outlook
- Free: 300 emails/day
- Office 365: Higher limits

### Professional Services
- SendGrid Free: 100 emails/day
- Mailgun Free: 5,000 emails/month
- Consider paid plans for production

## 🆘 Support

If emails still don't send after configuration:
1. Check terminal for specific error messages
2. Verify all environment variables are set
3. Test SMTP credentials with online tools
4. Try different email provider
5. Check email provider's documentation
