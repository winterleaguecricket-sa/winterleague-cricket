#!/bin/bash
# Automated Deployment Script for Winter League Cricket
# Server: winterleaguecricket.co.za

set -e  # Exit on any error

echo "🏏 Winter League Cricket - Automated Deployment"
echo "================================================"
echo ""

# Configuration
APP_NAME="winter-cricket"
APP_DIR="/home/vmycnmyo/winterleague-cricket"
DB_NAME="winterleague_cricket"
DB_USER="winterleague_user"
DB_PASS="Bailey&Love2015!"
DOMAIN="winterleaguecricket.co.za"
PORT=3001

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_step() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  $1"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Step 1: Check if running as correct user
print_step "Step 1: Checking user"
CURRENT_USER=$(whoami)
if [ "$CURRENT_USER" != "vmycnmyo" ]; then
    print_warning "Running as $CURRENT_USER. Attempting to switch to vmycnmyo..."
    exec su - vmycnmyo -c "bash $0"
fi
print_success "Running as correct user: $CURRENT_USER"

# Step 2: Install system dependencies
print_step "Step 2: Installing system dependencies"

# Check if running as root for system installations
if [ "$EUID" -ne 0 ]; then
    print_warning "Some steps require root access. You may be prompted for password."
fi

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    print_warning "Node.js not found. Installing Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    print_success "Node.js installed: $(node -v)"
else
    print_success "Node.js already installed: $(node -v)"
fi

# Install PostgreSQL if not present
if ! command -v psql &> /dev/null; then
    print_warning "PostgreSQL not found. Installing..."
    sudo apt-get update
    sudo apt-get install -y postgresql postgresql-contrib
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    print_success "PostgreSQL installed"
else
    print_success "PostgreSQL already installed"
fi

# Install Nginx if not present
if ! command -v nginx &> /dev/null; then
    print_warning "Nginx not found. Installing..."
    sudo apt-get install -y nginx
    sudo systemctl start nginx
    sudo systemctl enable nginx
    print_success "Nginx installed"
else
    print_success "Nginx already installed"
fi

# Install PM2 if not present
if ! command -v pm2 &> /dev/null; then
    print_warning "PM2 not found. Installing..."
    sudo npm install -g pm2
    print_success "PM2 installed"
else
    print_success "PM2 already installed"
fi

# Install Certbot for SSL
if ! command -v certbot &> /dev/null; then
    print_warning "Certbot not found. Installing..."
    sudo apt-get install -y certbot python3-certbot-nginx
    print_success "Certbot installed"
else
    print_success "Certbot already installed"
fi

# Step 3: Create application directory
print_step "Step 3: Setting up application directory"
if [ ! -d "$APP_DIR" ]; then
    mkdir -p "$APP_DIR"
    print_success "Created directory: $APP_DIR"
else
    print_success "Directory already exists: $APP_DIR"
fi

cd "$APP_DIR"

# Step 4: Setup database
print_step "Step 4: Setting up PostgreSQL database"

# Check if database exists
DB_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>/dev/null || echo "0")

if [ "$DB_EXISTS" = "1" ]; then
    print_warning "Database $DB_NAME already exists"
else
    print_warning "Creating database $DB_NAME..."
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;"
    print_success "Database created"
fi

# Check if user exists
USER_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" 2>/dev/null || echo "0")

if [ "$USER_EXISTS" = "1" ]; then
    print_warning "Database user $DB_USER already exists"
else
    print_warning "Creating database user $DB_USER..."
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASS';"
    print_success "Database user created"
fi

# Grant privileges
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
sudo -u postgres psql -c "ALTER DATABASE $DB_NAME OWNER TO $DB_USER;"
print_success "Database privileges granted"

# Step 5: Copy application files
print_step "Step 5: Application files"
print_warning "Application files should be in: $APP_DIR"
print_warning "Make sure you've uploaded all files via SCP/FTP"

if [ ! -f "$APP_DIR/package.json" ]; then
    print_error "package.json not found in $APP_DIR"
    print_error "Please upload your application files first!"
    exit 1
fi
print_success "Application files found"

# Step 6: Install dependencies
print_step "Step 6: Installing Node.js dependencies"
npm install --production
print_success "Dependencies installed"

# Step 7: Build application
print_step "Step 7: Building Next.js application"
npm run build
print_success "Application built successfully"

# Step 8: Initialize database schema
print_step "Step 8: Initializing database schema"
if [ -f "$APP_DIR/database/schema.sql" ]; then
    PGPASSWORD="$DB_PASS" psql -h localhost -U $DB_USER -d $DB_NAME -f database/schema.sql
    print_success "Database schema initialized"
else
    print_warning "schema.sql not found, skipping database initialization"
fi

# Step 9: Setup PM2
print_step "Step 9: Starting application with PM2"

# Stop existing process if running
pm2 stop $APP_NAME 2>/dev/null || true
pm2 delete $APP_NAME 2>/dev/null || true

# Start application
pm2 start ecosystem.config.js
pm2 save
print_success "Application started with PM2"

# Setup PM2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $CURRENT_USER --hp /home/$CURRENT_USER >/dev/null 2>&1 || true
print_success "PM2 configured to start on boot"

# Step 10: Configure Nginx
print_step "Step 10: Configuring Nginx"

NGINX_CONF="/etc/nginx/sites-available/winterleague-cricket"

if [ -f "$APP_DIR/nginx-config.conf" ]; then
    sudo cp "$APP_DIR/nginx-config.conf" "$NGINX_CONF"
    
    # Enable site
    sudo ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/winterleague-cricket
    
    # Test configuration
    sudo nginx -t
    
    # Reload Nginx
    sudo systemctl reload nginx
    
    print_success "Nginx configured"
else
    print_error "nginx-config.conf not found"
fi

# Step 11: Setup SSL Certificate
print_step "Step 11: Setting up SSL certificate"

print_warning "Setting up SSL with Let's Encrypt..."
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect || {
    print_warning "SSL setup failed or certificate already exists"
    print_warning "You can run manually: sudo certbot --nginx -d $DOMAIN"
}

# Step 12: Configure firewall
print_step "Step 12: Configuring firewall"
if command -v ufw &> /dev/null; then
    sudo ufw allow 'Nginx Full' >/dev/null 2>&1 || true
    sudo ufw allow OpenSSH >/dev/null 2>&1 || true
    print_success "Firewall configured"
else
    print_warning "UFW not installed, skipping firewall configuration"
fi

# Step 13: Final checks
print_step "Step 13: Final verification"

# Check if app is running
if pm2 list | grep -q "$APP_NAME.*online"; then
    print_success "Application is running"
else
    print_error "Application is not running!"
    pm2 logs $APP_NAME --lines 20
    exit 1
fi

# Check if port is listening
if sudo lsof -i :$PORT | grep -q LISTEN; then
    print_success "Application listening on port $PORT"
else
    print_warning "Port $PORT might not be accessible"
fi

# Check Nginx
if sudo nginx -t >/dev/null 2>&1; then
    print_success "Nginx configuration valid"
else
    print_error "Nginx configuration has errors"
fi

# Summary
print_step "🎉 Deployment Complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Deployment Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Website URL: https://$DOMAIN"
echo "🔐 Admin Panel: https://$DOMAIN/admin"
echo "🗄️  Database: $DB_NAME"
echo "📂 Directory: $APP_DIR"
echo "🔢 Port: $PORT"
echo "📊 PM2 Process: $APP_NAME"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Useful Commands:"
echo "  pm2 logs $APP_NAME          # View logs"
echo "  pm2 restart $APP_NAME       # Restart app"
echo "  pm2 monit                   # Monitor resources"
echo "  sudo systemctl status nginx # Check Nginx status"
echo ""
echo "🎯 Next Steps:"
echo "  1. Visit https://$DOMAIN to see your site"
echo "  2. Login to admin at https://$DOMAIN/admin"
echo "  3. Configure your products and settings"
echo ""
print_success "Deployment successful! 🏏"
