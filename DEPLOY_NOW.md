# 🚀 DEPLOYMENT INSTRUCTIONS
# Winter League Cricket - winterleaguecricket.co.za

## 📋 Step-by-Step Deployment Guide

### Step 1: Prepare Files Locally
```bash
# On your local machine in the project directory
cd /workspaces/codespaces-nextjs

# Create deployment package (excluding node_modules and .next)
tar -czf winterleague-cricket.tar.gz \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.git' \
  --exclude='*.tar.gz' \
  .
```

### Step 2: Upload to Server
```bash
# Upload the package to your server
scp winterleague-cricket.tar.gz vmycnmyo@102.209.119.17:/home/vmycnmyo/

# SSH into your server
ssh vmycnmyo@102.209.119.17
# Password: Bailey&Love2015!
```

### Step 3: Extract Files on Server
```bash
# Once logged into the server
cd /home/vmycnmyo

# Create directory and extract
mkdir -p winterleague-cricket
tar -xzf winterleague-cricket.tar.gz -C winterleague-cricket/

# Navigate to directory
cd winterleague-cricket

# Make scripts executable
chmod +x deploy.sh
chmod +x database/init.sh
chmod +x check-production-ready.sh
```

### Step 4: Run Automated Deployment
```bash
# Run the deployment script
sudo bash deploy.sh
```

The script will automatically:
- ✅ Install Node.js, PostgreSQL, Nginx, PM2
- ✅ Create database and user
- ✅ Install dependencies
- ✅ Build the application
- ✅ Initialize database schema
- ✅ Start with PM2
- ✅ Configure Nginx
- ✅ Setup SSL certificate
- ✅ Configure firewall

---

## 🎯 What's Configured

**Your Site:**
- URL: https://winterleaguecricket.co.za
- Admin Panel: https://winterleaguecricket.co.za/admin
- Admin Password: `wintercricketadmin123`

**Technical Details:**
- Port: 3001 (your existing site stays on its port)
- Database: winterleague_cricket
- Database User: winterleague_user
- PM2 Process Name: winter-cricket

---

## 📝 Verify Deployment

After the script completes, check:

```bash
# Check PM2 status
pm2 list

# View logs
pm2 logs winter-cricket

# Check if site is accessible locally
curl http://localhost:3001

# Check Nginx
sudo nginx -t
sudo systemctl status nginx

# Check database
psql -U winterleague_user -d winterleague_cricket -c "SELECT version();"
```

---

## 🌐 Test Your Site

1. **Visit:** https://winterleaguecricket.co.za
2. **Admin Login:** https://winterleaguecricket.co.za/admin
   - Password: `wintercricketadmin123`

---

## 🛠️ Useful Commands

```bash
# Application Management
pm2 restart winter-cricket    # Restart app
pm2 stop winter-cricket        # Stop app
pm2 logs winter-cricket        # View logs
pm2 monit                      # Monitor resources

# Nginx Management
sudo systemctl status nginx    # Check status
sudo nginx -t                  # Test config
sudo systemctl reload nginx    # Reload config

# Database Access
psql -U winterleague_user -d winterleague_cricket

# View Application Files
cd /home/vmycnmyo/winterleague-cricket
```

---

## ⚠️ If Something Goes Wrong

### Issue: Port 3001 already in use
```bash
# Check what's using the port
sudo lsof -i :3001

# Kill if needed
sudo kill -9 <PID>

# Or choose different port in .env
```

### Issue: SSL certificate fails
```bash
# Make sure DNS points to server
# Run manually:
sudo certbot --nginx -d winterleaguecricket.co.za -d www.winterleaguecricket.co.za
```

### Issue: Database connection fails
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Verify database
sudo -u postgres psql -l | grep winterleague
```

### Issue: Nginx 502 Bad Gateway
```bash
# Check if app is running
pm2 list

# Check logs for errors
pm2 logs winter-cricket

# Restart application
pm2 restart winter-cricket
```

---

## 📧 Email Setup (Later)

To add email notifications later:

1. Edit `.env` file:
```bash
nano /home/vmycnmyo/winterleague-cricket/.env
```

2. Update email settings:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

3. Restart app:
```bash
pm2 restart winter-cricket
```

---

## 🎉 Post-Deployment

Once live:
1. ✅ Login to admin panel
2. ✅ Configure site settings
3. ✅ Add products
4. ✅ Test checkout flow
5. ✅ Setup PayFast when ready

---

## 🔐 Security Notes

**Your Credentials:**
- Admin Password: `wintercricketadmin123`
- Database Password: `Bailey&Love2015!`
- SSH Password: `Bailey&Love2015!`

**⚠️ IMPORTANT:** Consider changing these passwords after deployment for better security!

---

**Need help? Check logs with:** `pm2 logs winter-cricket`
