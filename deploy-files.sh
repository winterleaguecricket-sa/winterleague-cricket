#!/bin/bash
# Universal File Deployment Script for Winter League Cricket
# Usage: ./deploy-files.sh file1.js file2.js ...
# Files are specified relative to project root (e.g., components/FormDisplay.js)

set -e

# Configuration
SERVER_USER="vmycnmyo"
SERVER_HOST="winterleaguecricket.co.za"
SERVER_PASS="Bailey&Love2015!"
APP_DIR="/home/vmycnmyo/winterleague-cricket"
LOCAL_ROOT="/workspaces/codespaces-nextjs"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_info() { echo -e "${CYAN}→ $1${NC}"; }

echo ""
echo "🏏 Winter League Cricket - File Deployment"
echo "==========================================="
echo ""

# Check arguments
if [ $# -eq 0 ]; then
    print_error "No files specified!"
    echo ""
    echo "Usage: ./deploy-files.sh <file1> <file2> ..."
    echo ""
    echo "Examples:"
    echo "  ./deploy-files.sh components/FormDisplay.js"
    echo "  ./deploy-files.sh components/FormDisplay.js data/forms.js"
    echo "  ./deploy-files.sh pages/api/player-lookup.js"
    echo ""
    exit 1
fi

# Check sshpass
if ! command -v sshpass &> /dev/null; then
    print_error "sshpass is not installed. Install with: sudo apt install sshpass"
    exit 1
fi

# Validate all files exist BEFORE doing anything
echo "Validating files..."
VALID=true
for file in "$@"; do
    full_path="${LOCAL_ROOT}/${file}"
    if [ -f "$full_path" ]; then
        print_success "Found: $file"
    else
        print_error "NOT FOUND: $file"
        print_error "  Expected at: $full_path"
        VALID=false
    fi
done

if [ "$VALID" = false ]; then
    echo ""
    print_error "Some files not found. Aborting deployment."
    exit 1
fi

echo ""
echo "Deployment plan:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
for file in "$@"; do
    echo "  ${LOCAL_ROOT}/${file}"
    echo "    → ${SERVER_USER}@${SERVER_HOST}:${APP_DIR}/${file}"
done
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Deploy each file with EXPLICIT full paths
echo "Deploying files..."
for file in "$@"; do
    local_path="${LOCAL_ROOT}/${file}"
    remote_path="${APP_DIR}/${file}"
    remote_dir=$(dirname "$remote_path")
    
    # Ensure remote directory exists
    sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_HOST} "mkdir -p ${remote_dir}" 2>/dev/null
    
    # Copy file with FULL explicit paths - never use directory shorthand
    sshpass -p "$SERVER_PASS" scp -o StrictHostKeyChecking=no "$local_path" "${SERVER_USER}@${SERVER_HOST}:${remote_path}"
    
    print_success "Deployed: $file"
done

echo ""
echo "Verifying deployment..."
for file in "$@"; do
    remote_path="${APP_DIR}/${file}"
    # Check file exists on server
    if sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_HOST} "test -f ${remote_path}" 2>/dev/null; then
        print_success "Verified: $file exists on server"
    else
        print_error "VERIFICATION FAILED: $file not found on server!"
        exit 1
    fi
done

echo ""
echo "Building application..."
sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_HOST} "cd ${APP_DIR} && npm run build"

echo ""
echo "Restarting PM2..."
sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_HOST} "cd ${APP_DIR} && pm2 restart winter-cricket"

echo ""
print_success "Deployment complete!"
echo ""
