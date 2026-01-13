# 🚀 Quick Deploy to Shared Server

## TL;DR - Deploy in 5 Minutes

### 1. Upload Files to Server
```bash
# On your local machine
scp -r /path/to/winterleague-cricket user@your-server:/var/www/cricket-shop
```

### 2. Install & Build
```bash
# SSH into your server
ssh user@your-server
cd /var/www/cricket-shop

# Install dependencies
npm install

# Configure environment
cp .env.example .env
nano .env  # Edit: PORT=3001, database credentials, passwords

# Build
npm run build
```

### 3. Setup Database
```bash
# Create database
sudo -u postgres psql -c "CREATE DATABASE winterleague_cricket;"

# Initialize schema
./database/init.sh
```

### 4. Start with PM2
```bash
# Update ecosystem.config.js path
nano ecosystem.config.js  # Change cwd to /var/www/cricket-shop

# Start app
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Follow instructions
```

### 5. Configure Nginx
```bash
# Copy nginx config
sudo cp nginx-config.conf /etc/nginx/sites-available/cricket-shop

# Edit domain/port
sudo nano /etc/nginx/sites-available/cricket-shop
# Change: cricket.yourdomain.com and port if needed

# Enable site
sudo ln -s /etc/nginx/sites-available/cricket-shop /etc/nginx/sites-enabled/

# Test & reload
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Setup SSL
```bash
sudo certbot --nginx -d cricket.yourdomain.com
```

### 7. Done! ✅
Visit: `https://cricket.yourdomain.com`

---

## 🔍 Verify No Conflicts

```bash
# Check both apps running
pm2 list
# Should show both processes on different ports

# Check ports
sudo netstat -tulpn | grep LISTEN
# Existing app: :3000
# Cricket shop: :3001

# Test locally
curl http://localhost:3001
```

---

## 📋 Configuration Summary

| Item | Existing App | Cricket Shop |
|------|--------------|--------------|
| **Port** | 3000 | 3001 |
| **Domain** | yourdomain.com | cricket.yourdomain.com |
| **Database** | existing_db | winterleague_cricket |
| **PM2 Name** | existing-app | cricket-shop |
| **Directory** | /var/www/existing | /var/www/cricket-shop |

---

## 🛠️ Essential Commands

```bash
# Start/Stop
pm2 start cricket-shop
pm2 stop cricket-shop
pm2 restart cricket-shop

# Logs
pm2 logs cricket-shop
pm2 logs cricket-shop --lines 100

# Monitor
pm2 monit

# Nginx
sudo nginx -t              # Test config
sudo systemctl reload nginx # Apply changes
```

---

## ⚠️ Common Issues

### Port Already in Use
```bash
# Check what's using port 3001
sudo lsof -i :3001

# Choose different port in .env
PORT=3002
```

### Can't Access Site
1. Check app is running: `pm2 list`
2. Check Nginx config: `sudo nginx -t`
3. Check firewall: `sudo ufw status`
4. Check DNS points to server IP

### Database Connection Error
1. Verify PostgreSQL running: `sudo systemctl status postgresql`
2. Check credentials in .env
3. Verify database exists: `psql -l`

---

## 📞 Support

Full documentation: [MULTI_APP_SERVER_SETUP.md](./MULTI_APP_SERVER_SETUP.md)

---

**Both apps will run independently without conflicts!** 🎉
