#!/bin/bash
export SSHPASS='Bailey&Love2015!'
SSH_CMD="sshpass -e ssh -o StrictHostKeyChecking=no vmycnmyo@winterleaguecricket.co.za"

echo "========================================"
echo "1. PM2 ERROR LOGS"
echo "========================================"
$SSH_CMD "cat ~/.pm2/logs/winterleague-error.log 2>/dev/null | tail -100 || cat ~/.pm2/logs/winter-cricket-error.log 2>/dev/null | tail -100 || echo 'No PM2 error logs found'"

echo ""
echo "========================================"
echo "2. PM2 OUTPUT LOGS"
echo "========================================"
$SSH_CMD "cat ~/.pm2/logs/winterleague-out.log 2>/dev/null | tail -100 || cat ~/.pm2/logs/winter-cricket-out.log 2>/dev/null | tail -100 || echo 'No PM2 output logs found'"

echo ""
echo "========================================"
echo "3. RECENT FORM SUBMISSIONS"
echo "========================================"
$SSH_CMD "cd ~/winterleague-cricket && node -e \"const {query} = require('./lib/db'); (async () => { const r = await query('SELECT id, form_id, form_name, customer_email, status, approval_status, created_at FROM form_submissions ORDER BY created_at DESC LIMIT 10'); console.log(JSON.stringify(r.rows, null, 2)); process.exit(0); })()\""

echo ""
echo "========================================"
echo "4. CUSTOMER PROFILES"
echo "========================================"
$SSH_CMD "cd ~/winterleague-cricket && node -e \"const {query} = require('./lib/db'); (async () => { const r = await query('SELECT id, email, first_name, last_name, created_at FROM customers ORDER BY created_at DESC LIMIT 10'); console.log(JSON.stringify(r.rows, null, 2)); process.exit(0); })()\""

echo ""
echo "========================================"
echo "5. PM2 PROCESS LIST"
echo "========================================"
$SSH_CMD "pm2 list"

echo ""
echo "========================================"
echo "6. FORM_SUBMISSIONS TABLE SCHEMA"
echo "========================================"
$SSH_CMD "cd ~/winterleague-cricket && node -e \"const {query} = require('./lib/db'); (async () => { const r = await query(\\\"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'form_submissions'\\\"); console.log(JSON.stringify(r.rows, null, 2)); process.exit(0); })()\""

echo ""
echo "========================================"
echo "INVESTIGATION COMPLETE"
echo "========================================"
