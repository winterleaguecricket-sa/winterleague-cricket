#!/bin/bash
# Partial Deployment Script - Team Registration Form Fix
# Only deploys specific files related to the team registration form update

set -e

echo "🏏 Winter League Cricket - Partial Deployment"
echo "=============================================="
echo ""
echo "This script deploys ONLY the files changed for the team registration fix:"
echo "  - components/FormDisplay.js"
echo "  - data/forms.js"
echo "  - data/teams.js"
echo "  - pages/api/form-submissions.js (NEW)"
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
    "components/FormDisplay.js"
    "data/forms.js"
    "data/teams.js"
    "pages/api/form-submissions.js"
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
echo "Deploying files..."

# Deploy each file
for file in "${FILES_TO_DEPLOY[@]}"; do
    # Get directory path
    dir_path=$(dirname "$file")
    
    # Create directory on server if needed
    ssh ${SERVER_USER}@${SERVER_HOST} "mkdir -p ${APP_DIR}/${dir_path}"
    
    # Copy file
    scp "$file" "${SERVER_USER}@${SERVER_HOST}:${APP_DIR}/${file}"
    print_success "Deployed: $file"
done

echo ""
echo "Rebuilding application on server..."

# Rebuild on server
ssh ${SERVER_USER}@${SERVER_HOST} << 'EOF'
    cd /home/vmycnmyo/winterleague-cricket
    
    # Rebuild Next.js
    npm run build
    
    # Restart PM2
    pm2 restart winter-cricket || pm2 restart all
    
    echo "✓ Application rebuilt and restarted"
EOF

echo ""
print_success "Deployment complete!"
echo ""
echo "Changed deployed:"
echo "  1. Team Registration form now has 3 pages instead of 4"
echo "  2. Entry Fee section merged into Kit Costing page"
echo "  3. Form submission now creates team portal profile"
echo "  4. Team login credentials shown after registration"
echo ""
