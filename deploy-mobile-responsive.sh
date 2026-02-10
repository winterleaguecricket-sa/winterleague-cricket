#!/bin/bash
# Mobile Responsive Deployment Script
# Deploys CSS files updated for mobile compatibility

set -e

echo "🏏 Winter League Cricket - Mobile Responsive Deployment"
echo "========================================================"
echo ""
echo "This script deploys CSS files updated for mobile compatibility:"
echo "  - styles/adminSettings.module.css"
echo "  - styles/adminOrders.module.css"
echo "  - styles/adminProducts.module.css"
echo "  - styles/adminForms.module.css"
echo "  - styles/adminFunnels.module.css"
echo "  - styles/adminManage.module.css"
echo "  - styles/funnel.module.css"
echo "  - styles/channel.module.css"
echo "  - styles/teamPortal.module.css (new)"
echo ""

# Configuration
SERVER_USER="vmycnmyo"
SERVER_HOST="winterleaguecricket.co.za"
APP_DIR="/home/vmycnmyo/winterleague-cricket"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Files to deploy
FILES_TO_DEPLOY=(
    "styles/adminSettings.module.css"
    "styles/adminOrders.module.css"
    "styles/adminProducts.module.css"
    "styles/adminForms.module.css"
    "styles/adminFunnels.module.css"
    "styles/adminManage.module.css"
    "styles/funnel.module.css"
    "styles/channel.module.css"
    "styles/teamPortal.module.css"
)

echo "Files to be deployed:"
for file in "${FILES_TO_DEPLOY[@]}"; do
    echo "  📄 $file"
done
echo ""

# Prompt for password
echo -n "Enter SSH password for $SERVER_USER@$SERVER_HOST: "
read -s PASSWORD
echo ""

if [ -z "$PASSWORD" ]; then
    print_error "Password cannot be empty"
    exit 1
fi

# Check if sshpass is installed
if ! command -v sshpass &> /dev/null; then
    print_error "sshpass is not installed"
    echo "Install with: sudo apt install sshpass"
    exit 1
fi

echo ""
echo "Starting deployment..."
echo ""

# Deploy each file
for file in "${FILES_TO_DEPLOY[@]}"; do
    if [ -f "$file" ]; then
        # Create directory on server if needed
        dir=$(dirname "$file")
        sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "mkdir -p $APP_DIR/$dir" 2>/dev/null
        
        # Copy file
        sshpass -p "$PASSWORD" scp -o StrictHostKeyChecking=no "$file" "$SERVER_USER@$SERVER_HOST:$APP_DIR/$file" 2>/dev/null
        print_success "Deployed: $file"
    else
        print_warning "File not found: $file"
    fi
done

echo ""
echo "Rebuilding application on server..."
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "cd $APP_DIR && npm run build" 2>/dev/null

echo ""
echo "Restarting PM2 process..."
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "cd $APP_DIR && pm2 restart winterleague --update-env" 2>/dev/null

echo ""
print_success "Mobile responsive deployment complete!"
echo ""
echo "🌐 Test on mobile at: https://winterleaguecricket.co.za"
