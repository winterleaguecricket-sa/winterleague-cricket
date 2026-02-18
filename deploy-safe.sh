#!/bin/bash
# Safe deployment script - deploys files one at a time to their EXACT paths
# Usage: ./deploy-safe.sh file1 [file2] [file3] ...
# Example: ./deploy-safe.sh pages/parent-portal.js pages/admin/forms.js

set -e

SERVER="vmycnmyo@winterleaguecricket.co.za"
REMOTE_DIR="~/winterleague-cricket"
export SSHPASS='Bailey&Love2015!'

if [ $# -eq 0 ]; then
  echo "❌ No files specified."
  echo "Usage: ./deploy-safe.sh file1 [file2] [file3] ..."
  echo "Example: ./deploy-safe.sh pages/parent-portal.js pages/admin/forms.js"
  exit 1
fi

echo "=========================================="
echo "  SAFE DEPLOY - File-by-file upload"
echo "=========================================="
echo ""

# Step 1: Verify all files exist locally
echo "📋 Verifying local files..."
for FILE in "$@"; do
  if [ ! -f "$FILE" ]; then
    echo "❌ ERROR: Local file not found: $FILE"
    exit 1
  fi
  echo "  ✅ $FILE"
done
echo ""

# Step 2: Upload each file individually to its EXACT remote path
echo "📤 Uploading files one at a time..."
for FILE in "$@"; do
  REMOTE_PATH="$REMOTE_DIR/$FILE"
  echo "  Uploading: $FILE → $REMOTE_PATH"
  sshpass -e scp -o StrictHostKeyChecking=no "$FILE" "$SERVER:$REMOTE_PATH"
  echo "  ✅ Done"
done
echo ""

# Step 3: Verify MD5 checksums match
echo "🔍 Verifying checksums (local vs production)..."
ALL_MATCH=true
for FILE in "$@"; do
  LOCAL_MD5=$(md5sum "$FILE" | awk '{print $1}')
  REMOTE_MD5=$(sshpass -e ssh -o StrictHostKeyChecking=no "$SERVER" "md5sum $REMOTE_DIR/$FILE" | awk '{print $1}')
  if [ "$LOCAL_MD5" = "$REMOTE_MD5" ]; then
    echo "  ✅ $FILE - MATCH ($LOCAL_MD5)"
  else
    echo "  ❌ $FILE - MISMATCH! Local: $LOCAL_MD5, Remote: $REMOTE_MD5"
    ALL_MATCH=false
  fi
done
echo ""

if [ "$ALL_MATCH" = false ]; then
  echo "❌ CHECKSUM MISMATCH DETECTED! Aborting build."
  exit 1
fi

# Step 4: Build on production
echo "🔨 Building on production..."
sshpass -e ssh -o StrictHostKeyChecking=no "$SERVER" "cd $REMOTE_DIR && npx next build 2>&1 | tail -5"
echo ""

# Step 5: Restart PM2
echo "🔄 Restarting PM2..."
sshpass -e ssh -o StrictHostKeyChecking=no "$SERVER" "cd $REMOTE_DIR && pm2 restart winter-cricket 2>&1"
echo ""

echo "=========================================="
echo "  ✅ DEPLOY COMPLETE"
echo "=========================================="
