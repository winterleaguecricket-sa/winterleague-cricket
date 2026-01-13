# Production Deployment Guide
# Winter League Cricket E-Commerce Platform

## 🎯 Pre-Deployment Checklist

### ✅ Completed Setup
- [x] PostgreSQL database schema created
- [x] Environment variables configured
- [x] Admin authentication secured
- [x] Production optimizations added (next.config.js)
- [x] Security headers configured
- [x] Build tested successfully

---

## 📋 Database Setup

### 1. Install PostgreSQL
Ensure PostgreSQL is installed and running on your server.

### 2. Initialize Database
```bash
# Run the initialization script
./database/init.sh
```

Or manually:
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE winterleague_cricket;

# Run schema
psql -U postgres -d winterleague_cricket -f database/schema.sql
```

### 3. Configure Database Connection
Update `.env` file (production) with your database credentials:
```env
DATABASE_URL=postgresql://username:password@your-db-host:5432/winterleague_cricket
POSTGRES_HOST=your-db-host
POSTGRES_PORT=5432
POSTGRES_DB=winterleague_cricket
POSTGRES_USER=your_username
POSTGRES_PASSWORD=your_secure_password
```

---

## 🔐 Security Configuration

### 1. Admin Password
**CRITICAL**: Change the default admin password!

```env
ADMIN_PASSWORD=your_very_secure_password_here
NEXT_PUBLIC_ADMIN_PASSWORD=your_very_secure_password_here
JWT_SECRET=generate_a_random_64_character_string_here
```

Generate secure secrets:
```bash
# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2. Email Configuration (SMTP)
Configure your email service for order notifications:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_FROM_NAME=Your Store Name
ADMIN_EMAIL=admin@yourdomain.com
```

**For Gmail:**
1. Enable 2-Factor Authentication
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use the app password in SMTP_PASSWORD

### 3. PayFast Payment Gateway (South African)
Get your credentials from: https://www.payfast.co.za

```env
# For Testing (Sandbox)
PAYFAST_MERCHANT_ID=your_sandbox_merchant_id
PAYFAST_MERCHANT_KEY=your_sandbox_merchant_key
PAYFAST_PASSPHRASE=your_sandbox_passphrase
PAYFAST_URL=https://sandbox.payfast.co.za/eng/process

# For Production
PAYFAST_MERCHANT_ID=your_live_merchant_id
PAYFAST_MERCHANT_KEY=your_live_merchant_key
PAYFAST_PASSPHRASE=your_live_passphrase
PAYFAST_URL=https://www.payfast.co.za/eng/process
```

---

## 🚀 Deployment Options

### Option 1: Vercel (Recommended for Next.js)

1. **Push to GitHub**
```bash
git add .
git commit -m "Production ready"
git push origin main
```

2. **Deploy to Vercel**
- Go to https://vercel.com
- Import your GitHub repository
- Add environment variables in Vercel dashboard
- Deploy!

3. **Add PostgreSQL Database**
- Use Vercel Postgres, or
- Connect to external PostgreSQL (Supabase, Neon, etc.)

### Option 2: VPS/Cloud Server (DigitalOcean, AWS, etc.)

1. **Install Dependencies**
```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Install PM2 for process management
sudo npm install -g pm2
```

2. **Clone and Setup**
```bash
git clone your-repo-url
cd codespaces-nextjs
npm install
```

3. **Setup Environment**
```bash
# Copy and edit environment file
cp .env.example .env
nano .env
```

4. **Initialize Database**
```bash
./database/init.sh
```

5. **Build and Start**
```bash
# Build for production
npm run build

# Start with PM2
pm2 start npm --name "winter-cricket" -- start
pm2 save
pm2 startup
```

6. **Setup Nginx Reverse Proxy**
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

7. **SSL Certificate (Let's Encrypt)**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## 🔧 Environment Variables Reference

### Required for Production
```env
# Database
DATABASE_URL=postgresql://...
POSTGRES_HOST=
POSTGRES_PORT=
POSTGRES_DB=
POSTGRES_USER=
POSTGRES_PASSWORD=

# Security
ADMIN_PASSWORD=
NEXT_PUBLIC_ADMIN_PASSWORD=
JWT_SECRET=

# Site
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
NODE_ENV=production
```

### Optional but Recommended
```env
# Email (for order notifications)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=
SMTP_FROM_NAME=
ADMIN_EMAIL=

# Payment Gateway
PAYFAST_MERCHANT_ID=
PAYFAST_MERCHANT_KEY=
PAYFAST_PASSPHRASE=
PAYFAST_URL=
```

---

## 🧪 Testing Before Go-Live

### 1. Test Production Build Locally
```bash
npm run build
npm start
```
Visit http://localhost:3000

### 2. Test Admin Panel
- Go to `/admin`
- Login with your configured password
- Verify all admin sections work

### 3. Test Database Connection
```bash
# Create a test connection script
node -e "const { getPool } = require('./lib/db'); getPool().query('SELECT NOW()').then(() => console.log('✅ Database connected')).catch(e => console.error('❌ Database error:', e))"
```

### 4. Test Email Configuration
- Go to `/admin/email-config`
- Click "Test Connection"
- Send a test email

### 5. Test Order Flow
1. Add product to cart
2. Complete checkout
3. Verify order appears in `/admin/orders`
4. Check if email notifications sent

---

## 📊 Post-Deployment Monitoring

### Database Backups
```bash
# Setup automatic daily backups
pg_dump -U postgres winterleague_cricket > backup_$(date +%Y%m%d).sql
```

### Application Logs
```bash
# View PM2 logs
pm2 logs winter-cricket

# View error logs
pm2 logs winter-cricket --err
```

### Performance Monitoring
- Monitor database queries
- Check server resources (CPU, memory)
- Setup uptime monitoring (UptimeRobot, Pingdom)

---

## 🆘 Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Check connection
psql -U postgres -d winterleague_cricket -c "SELECT 1"
```

### Build Errors
```bash
# Clear cache and rebuild
rm -rf .next
npm run build
```

### Environment Variables Not Loading
- Restart the application after changing .env
- For Vercel: redeploy after changing environment variables
- Check file is named exactly `.env.local` or `.env`

---

## 📞 Support & Maintenance

### Regular Tasks
- [ ] Weekly database backups
- [ ] Monthly security updates: `npm audit fix`
- [ ] Monitor disk space
- [ ] Review error logs
- [ ] Check email deliverability

### Updates
```bash
# Update dependencies (be careful!)
npm update
npm audit fix

# Test after updates
npm run build
```

---

## 🎉 Go Live Checklist

Before making your site public:

- [ ] Database initialized and accessible
- [ ] All environment variables set correctly
- [ ] Admin password changed from default
- [ ] Email notifications tested
- [ ] PayFast configured (production credentials)
- [ ] SSL certificate installed
- [ ] Domain name pointed to server
- [ ] Test orders processed successfully
- [ ] Backup system configured
- [ ] Error monitoring setup

---

## 📝 Important Files

```
.env.local          # Development environment variables
.env                # Production environment variables (server)
.env.example        # Template for environment variables
next.config.js      # Production optimizations & security
database/schema.sql # Database structure
database/init.sh    # Database initialization script
lib/db.js          # Database connection
lib/auth.js        # Authentication utilities
```

---

## 🔒 Security Best Practices

1. **Never commit** `.env` or `.env.local` to Git
2. **Change default passwords** immediately
3. **Use HTTPS** in production (SSL certificate)
4. **Regular backups** of database
5. **Keep dependencies updated**: `npm audit`
6. **Monitor logs** for suspicious activity
7. **Use strong passwords** for admin and database
8. **Restrict database** access to application only

---

## 📈 Scaling Considerations

When your traffic grows:
- Add database connection pooling (already configured)
- Consider CDN for static assets
- Implement Redis for session management
- Database read replicas for high traffic
- Load balancer for multiple app instances

---

**Deployed successfully? 🎉**
Access your admin panel at: `https://yourdomain.com/admin`

For questions or issues, review the guides in the project root:
- `NODEMAILER_SETUP.md` - Email configuration
- `CUSTOMER_PROFILE_PAYFAST_GUIDE.md` - PayFast integration
- `ORDER_EMAIL_AUTOMATION_GUIDE.md` - Order notifications
