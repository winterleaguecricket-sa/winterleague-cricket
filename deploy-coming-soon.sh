#!/bin/bash
# Partial Deployment Script - Coming Soon Splash Screen Feature
# Only deploys specific files related to the Coming Soon feature

set -e

echo "🏏 Winter League Cricket - Coming Soon Feature Deployment"
echo "=========================================================="
echo ""
echo "This script deploys ONLY the files changed for the Coming Soon splash screen:"
echo "  - components/ComingSoon.js"
echo "  - pages/coming-soon.js"
echo "  - pages/index.js"
echo "  - pages/admin/settings.js"
echo "  - pages/api/homepage.js"
echo "  - pages/api/upload-coming-soon.js"
echo "  - data/homepage.js"
echo "  - data/homepage.json"
echo "  - styles/comingSoon.module.css"
echo "  - middleware.js"
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
    "components/ComingSoon.js"
    "pages/coming-soon.js"
    "pages/index.js"
    "pages/admin/settings.js"
    "pages/api/homepage.js"
    "pages/api/upload-coming-soon.js"
    "data/homepage.js"
    "data/homepage.json"
    "styles/comingSoon.module.css"
    "middleware.js"
)

echo "Files to be deployed:"
for file in "${FILES_TO_DEPLOY[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✓ $file"
    else
        echo "  ✗ $file (NOT FOUND!)"
        exit 1
    fi
done

echo ""
read -p "Do you want to proceed with deployment? (y/n): " confirm
if [ "$confirm" != "y" ]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""
read -s -p "Enter SSH password: " SSH_PASS
echo ""

echo ""
echo "Deploying files..."

# Deploy each file
for file in "${FILES_TO_DEPLOY[@]}"; do
    # Get directory path
    dir_path=$(dirname "$file")
    
    # Create directory on server if needed
    sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_HOST} "mkdir -p ${APP_DIR}/${dir_path}"
    
    # Copy file
    sshpass -p "$SSH_PASS" scp -o StrictHostKeyChecking=no "$file" "${SERVER_USER}@${SERVER_HOST}:${APP_DIR}/${file}"
    print_success "Deployed: $file"
done

echo ""
echo "Rebuilding application on server..."

# Rebuild on server
sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_HOST} << 'EOF'
    cd /home/vmycnmyo/winterleague-cricket
    
    # WARNING: Do NOT run 'rm -rf .next' — causes intermittent build failures.
    # Incremental builds are reliable. If a build fails, just re-run it.
    # Rebuild Next.js
    npm run build
    
    # Restart PM2
    pm2 restart winter-cricket || pm2 restart all
    
    echo "✓ Application rebuilt and restarted"
EOF

echo ""
print_success "Deployment complete!"
echo ""
echo "Changes deployed:"
echo "  1. Coming Soon splash screen component"
echo "  2. Admin toggle in Site Settings to enable/disable splash"
echo "  3. Homepage shows splash when enabled (public users only)"
echo "  4. Admin can preview homepage using ?preview=1"
echo ""
echo "To enable the splash screen:"
echo "  1. Go to Admin > Site Settings"
echo "  2. Enable 'Coming Soon splash on homepage'"
echo "  3. Save changes"
echo ""
