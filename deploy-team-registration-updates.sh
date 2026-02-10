#!/bin/bash
# Partial Deployment Script - Team Registration Updates
# Deploys only the changed files for team registration success page and form background image

set -e

echo "🏏 Winter League Cricket - Team Registration Updates Deployment"
echo "==============================================================="
echo ""
echo "This script deploys ONLY the files changed for the team registration updates:"
echo "  - components/FormDisplay.js"
echo "  - pages/admin/forms.js"
echo "  - pages/api/form-background.js"
echo "  - styles/adminForms.module.css"
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
    "pages/admin/forms.js"
    "pages/api/form-background.js"
    "styles/adminForms.module.css"
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

if [ -z "$SSH_PASS" ]; then
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
echo "Deploying files..."

# Deploy each file
for file in "${FILES_TO_DEPLOY[@]}"; do
    dir_path=$(dirname "$file")
    sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_HOST} "mkdir -p ${APP_DIR}/${dir_path}"
    sshpass -p "$SSH_PASS" scp -o StrictHostKeyChecking=no "$file" "${SERVER_USER}@${SERVER_HOST}:${APP_DIR}/${file}"
    print_success "Deployed: $file"
done

echo ""
echo "Ensuring upload directory exists on server..."
sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_HOST} "mkdir -p ${APP_DIR}/public/uploads/site-settings"
print_success "Ensured: public/uploads/site-settings"

echo ""
echo "Rebuilding application on server..."
sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_HOST} "cd ${APP_DIR} && npm run build"

echo ""
echo "Restarting PM2 process..."
sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_HOST} "cd ${APP_DIR} && pm2 restart winterleague --update-env"

echo ""
print_success "Deployment complete!"

echo ""
echo "Changes deployed:"
echo "  1. Team registration success summary with OK reset"
echo "  2. Form background image upload and persistence (Postgres)"
echo "  3. Trim color preview default aligned"
echo ""
