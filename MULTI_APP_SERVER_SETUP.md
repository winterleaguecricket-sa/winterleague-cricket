# Running Multiple Web Apps on Same Server

## 🔄 Configuration for Separate Deployment

This guide helps you run the Winter League Cricket app alongside your existing web app on the same server without conflicts.

---

## 📋 Strategy Overview

We'll ensure separation using:
1. **Different Ports** - Each app runs on its own port
2. **Different Domains/Subdomains** - Nginx routes traffic appropriately
3. **Separate PM2 Processes** - Independent process management
4. **Separate Databases** - Each app has its own database
5. **Different Environment Variables** - No cross-contamination

---

## 🔧 Step 1: Configure Custom Port

### Option A: Environment Variable (Recommended)
Add to your `.env` file:
```env
PORT=3001
# Or any available port: 3002, 3003, 8080, etc.
```

### Option B: Update package.json
```json
{
  "scripts": {
    "dev": "next -p 3001",
    "start": "next start -p 3001"
  }
}
```

### Option C: Server-side Configuration
Create `server.js` in project root:
```javascript
const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = process.env.PORT || 3001

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })
    .once('error', (err) => {
      console.error(err)
      process.exit(1)
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`)
    })
})
```

Update package.json:
```json
{
  "scripts": {
    "dev": "node server.js",
    "build": "next build",
    "start": "NODE_ENV=production node server.js"
  }
}
```

---

## 🗄️ Step 2: Separate Database

### Create Separate PostgreSQL Database
```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create new database for this app
CREATE DATABASE winterleague_cricket;
CREATE USER winterleague_user WITH ENCRYPTED PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE winterleague_cricket TO winterleague_user;
\q
```

### Update .env
```env
DATABASE_URL=postgresql://winterleague_user:secure_password_here@localhost:5432/winterleague_cricket
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=winterleague_cricket
POSTGRES_USER=winterleague_user
POSTGRES_PASSWORD=secure_password_here
```

### Initialize Database
```bash
./database/init.sh
```

---

## 🔄 Step 3: PM2 Process Management

### Setup PM2 with Unique Name
```bash
# Install PM2 globally if not already installed
npm install -g pm2

# Start app with unique name
pm2 start npm --name "cricket-shop" -- start

# Or using custom port
PORT=3001 pm2 start npm --name "cricket-shop" -- start

# Save PM2 configuration
pm2 save

# View all running processes
pm2 list

# View logs
pm2 logs cricket-shop
```

### PM2 Ecosystem File (Recommended)
Create `ecosystem.config.js` in project root:
```javascript
module.exports = {
  apps: [{
    name: 'cricket-shop',
    script: 'npm',
    args: 'start',
    cwd: '/path/to/winterleague-cricket',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}
```

Start with ecosystem:
```bash
pm2 start ecosystem.config.js
pm2 save
```

---

## 🌐 Step 4: Nginx Configuration

### Setup Virtual Host for New App

Create Nginx configuration: `/etc/nginx/sites-available/cricket-shop`

```nginx
# Cricket Shop Configuration
server {
    listen 80;
    server_name cricket.yourdomain.com;  # Use subdomain or different domain
    
    # Optional: Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name cricket.yourdomain.com;
    
    # SSL Configuration (use certbot to generate)
    ssl_certificate /etc/letsencrypt/live/cricket.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cricket.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Proxy to Next.js app on port 3001
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Static files optimization
    location /_next/static {
        proxy_pass http://localhost:3001;
        proxy_cache_valid 60m;
        add_header Cache-Control "public, max-age=3600, immutable";
    }
    
    # Client max body size (for file uploads)
    client_max_body_size 20M;
}
```

### Alternative: Path-Based Routing (Same Domain)

If you want to serve on the same domain under a path:

```nginx
# Add to your existing server block
server {
    listen 80;
    server_name yourdomain.com;
    
    # Your existing app
    location / {
        proxy_pass http://localhost:3000;
        # ... other proxy settings
    }
    
    # New Cricket Shop app
    location /cricket {
        rewrite ^/cricket(.*)$ $1 break;
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Note:** For path-based routing, update [next.config.js](next.config.js):
```javascript
module.exports = {
  basePath: '/cricket',
  assetPrefix: '/cricket',
  // ... rest of config
}
```

### Enable Nginx Configuration
```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/cricket-shop /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## 🔐 Step 5: SSL Certificate

### Using Let's Encrypt (Certbot)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Generate certificate
sudo certbot --nginx -d cricket.yourdomain.com

# Certificates auto-renew, test with:
sudo certbot renew --dry-run
```

---

## 📁 Step 6: File Structure on Server

Recommended directory structure:
```
/var/www/
├── existing-app/           # Your current app
│   ├── node_modules/
│   ├── .env
│   └── ...
└── cricket-shop/           # New Winter League Cricket app
    ├── node_modules/
    ├── .env
    ├── .next/
    ├── database/
    └── ...
```

---

## 🔍 Step 7: Verify No Conflicts

### Check Port Availability
```bash
# Check what's running on ports
sudo netstat -tulpn | grep LISTEN

# Or using ss
sudo ss -tulpn | grep LISTEN

# Check specific port
sudo lsof -i :3001
```

### Check Process Status
```bash
# List all PM2 processes
pm2 list

# Should see both apps running on different ports
# existing-app    │ 0       │ running │ 3000
# cricket-shop    │ 1       │ running │ 3001
```

### Test Applications
```bash
# Test existing app
curl http://localhost:3000

# Test new cricket app
curl http://localhost:3001
```

---

## 📝 Complete Deployment Checklist

### Pre-Deployment
- [ ] Choose available port (default: 3001)
- [ ] Choose domain/subdomain (e.g., cricket.yourdomain.com)
- [ ] Create separate database
- [ ] Configure environment variables with correct port

### Deployment
- [ ] Clone repository to server
- [ ] Install dependencies: `npm install`
- [ ] Create `.env` file with production settings
- [ ] Update PORT in `.env`
- [ ] Build application: `npm run build`
- [ ] Initialize database: `./database/init.sh`

### Server Configuration
- [ ] Create PM2 ecosystem file
- [ ] Start with PM2: `pm2 start ecosystem.config.js`
- [ ] Save PM2 config: `pm2 save`
- [ ] Create Nginx virtual host
- [ ] Enable Nginx config
- [ ] Test Nginx: `sudo nginx -t`
- [ ] Reload Nginx: `sudo systemctl reload nginx`
- [ ] Generate SSL certificate: `sudo certbot --nginx -d cricket.yourdomain.com`

### Testing
- [ ] Access via subdomain in browser
- [ ] Test admin login
- [ ] Test complete order flow
- [ ] Check both apps are accessible
- [ ] Verify no port conflicts
- [ ] Check PM2 logs for errors

---

## 🛠️ Useful Commands

```bash
# PM2 Management
pm2 list                           # List all processes
pm2 logs cricket-shop             # View logs
pm2 restart cricket-shop          # Restart app
pm2 stop cricket-shop             # Stop app
pm2 delete cricket-shop           # Remove from PM2
pm2 monit                         # Monitor resources

# Nginx Management
sudo nginx -t                     # Test config
sudo systemctl status nginx       # Check status
sudo systemctl reload nginx       # Reload config
sudo systemctl restart nginx      # Restart Nginx
sudo tail -f /var/log/nginx/error.log  # View errors

# Port Management
sudo lsof -i :3001               # Check port 3001
sudo kill -9 $(lsof -t -i:3001)  # Kill process on port

# Database
psql -U winterleague_user -d winterleague_cricket  # Connect to DB
```

---

## 🔥 Troubleshooting

### Port Already in Use
```bash
# Find process using the port
sudo lsof -i :3001

# Kill the process
sudo kill -9 <PID>

# Or choose different port in .env
```

### Nginx 502 Bad Gateway
- Check if app is running: `pm2 list`
- Check app logs: `pm2 logs cricket-shop`
- Verify port matches in Nginx config and .env
- Check firewall isn't blocking the port

### Database Connection Failed
- Verify PostgreSQL is running: `sudo systemctl status postgresql`
- Check database exists: `psql -U postgres -l`
- Verify credentials in .env match database
- Check DATABASE_URL format is correct

### Apps Interfering With Each Other
- Ensure different ports in .env files
- Verify separate database names
- Check PM2 process names are unique
- Confirm Nginx configs point to correct ports

---

## 📊 Resource Allocation

### Recommended Server Resources (Both Apps)
- **RAM**: 2GB minimum (1GB per app)
- **CPU**: 2 cores minimum
- **Disk**: 20GB minimum
- **Database**: Separate instance or shared with different DBs

### Monitor Resources
```bash
# Check memory usage
pm2 monit

# Detailed system info
htop

# Disk usage
df -h
```

---

## 🎯 Summary

Your apps will run separately with:
- **Existing App**: Port 3000, `yourdomain.com`
- **Cricket Shop**: Port 3001, `cricket.yourdomain.com`
- **Separate databases**: No data mixing
- **Independent processes**: PM2 manages both
- **Nginx routing**: Directs traffic correctly

**Both apps run independently without conflicts!** 🚀
