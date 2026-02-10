#!/bin/bash
# Deploy Homepage Gallery Upload Feature
# Deploys only the changed files for gallery image upload and tab styling

set -e

echo "🏏 Winter League Cricket - Homepage Gallery Upload Deployment"
echo "============================================================="
echo ""
echo "This script deploys files for the homepage gallery upload feature:"
echo "  - pages/api/upload-homepage-gallery.js (new upload endpoint)"
echo "  - pages/admin/homepage.js (updated with file upload)"
echo "  - styles/adminSettings.module.css (updated tab styling)"
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
    "pages/api/upload-homepage-gallery.js"
    "pages/admin/homepage.js"
    "styles/adminSettings.module.css"
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

# Create the upload directory on the server
echo ""
echo "Creating upload directory on server..."
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "mkdir -p $APP_DIR/public/uploads/homepage-gallery" 2>/dev/null
print_success "Created: public/uploads/homepage-gallery"

echo ""
echo "Rebuilding application on server..."
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "cd $APP_DIR && npm run build" 2>/dev/null

echo ""
echo "Restarting PM2 process..."
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "cd $APP_DIR && pm2 restart winterleague --update-env" 2>/dev/null

echo ""
print_success "Homepage gallery upload deployment complete!"
echo ""
echo "🌐 Test at: https://winterleaguecricket.co.za/admin/homepage"
