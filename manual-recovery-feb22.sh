#!/bin/bash
# =========================================================================
# MANUAL RECOVERY SCRIPT — Run ONLY if localStorage recovery doesn't work
# =========================================================================
# This creates form_submissions + team_players for the 2 broken orders
# from Feb 22, 2026 where the safety net was missing.
#
# IMPORTANT: Run the check queries FIRST to verify records don't already exist
# before running the INSERT statements.
# =========================================================================

export PGPASSWORD='Bailey&Love2015!'
DB="psql -h localhost -U winterleague_user -d winterleague_cricket"

echo "============================================="
echo "  PRE-CHECK: Verify records DON'T exist yet"
echo "============================================="

echo ""
echo "--- Checking for existing Dennehy submissions ---"
$DB -c "SELECT id, customer_email, created_at FROM form_submissions WHERE customer_email ILIKE '%dennehy%' OR data::text ILIKE '%dennehy%';"

echo ""
echo "--- Checking for existing Mistri submissions ---"
$DB -c "SELECT id, customer_email, created_at FROM form_submissions WHERE customer_email ILIKE '%mistri%' OR data::text ILIKE '%mistri%';"

echo ""
echo "--- Checking for existing Dennehy team_players ---"
$DB -c "SELECT id, team_id, player_name, player_email, payment_status FROM team_players WHERE player_name ILIKE '%dennehy%' OR player_email ILIKE '%dennehy%';"

echo ""
echo "--- Checking for existing Mistri team_players ---"
$DB -c "SELECT id, team_id, player_name, player_email, payment_status FROM team_players WHERE player_name ILIKE '%mistri%' OR player_email ILIKE '%mistri%';"

echo ""
echo "============================================="
echo "If ALL checks above show (0 rows), proceed."
echo "If any show results, DO NOT run inserts."
echo "============================================="
echo ""
read -p "Press Enter to run inserts, or Ctrl+C to abort... "

# =========================================================================
# Recovery Data (from order items JSONB):
# 
# Order ORD1771743756313 - Anne Dennehy (dennehyas@gmail.com, 0832603594)
#   Player: Cole Dennehy
#   Shirt: 11/12 years, Pants: 11/12 years
#   Additional: Short Sleeve Shirt Kits 17 (11/12 years)
#   Kit 17 = Royal Falcons (team_id 10) or COACH KG (team_id 14)
#   Royal Falcons has U11 age group which matches 11/12 years sizing
#   → Assigning to team_id 10 (Royal Falcons), sub_team TBD
#
# Order ORD1771741872622 - Jitendra Mistri (Jbmistri@gmail.com, 0833072549)
#   Player: Vahin Mistri
#   Shirt: Medium, Pants: Medium
#   Additional: Winter League Cap (Supporter)
#   → Team unknown from order data — needs team assignment from admin
#   → Creating with team_id NULL
# =========================================================================

echo ""
echo "=== INSERTING form_submission for Cole Dennehy ==="
$DB -c "INSERT INTO form_submissions (form_id, form_name, data, customer_email, status, approval_status)
VALUES (
  '2',
  'Player Registration',
  '{\"6\": \"Cole Dennehy\", \"37\": \"Anne Dennehy\", \"38\": \"dennehyas@gmail.com\", \"39\": \"\", \"40\": \"0832603594\", \"25_shirtSize\": \"11/12 years\", \"25_pantsSize\": \"11/12 years\", \"_recovered\": true, \"_recoveryNote\": \"Manually recovered from order ORD1771743756313 - form submission lost due to safety net removal\", \"_cartItems\": [{\"id\": \"basic-kit\", \"name\": \"Basic Kit\", \"price\": 550, \"quantity\": 1, \"selectedSize\": \"Player 1 - Cole Dennehy | Shirt: 11/12 years / Pants: 11/12 years\"}, {\"id\": 83, \"name\": \"Short Sleeve Shirt Kits 17\", \"price\": 290, \"quantity\": 1, \"selectedSize\": \"11/12 years\"}], \"_cartTotal\": 840}'::jsonb,
  'dennehyas@gmail.com',
  'pending',
  'pending'
) RETURNING id;"

DENNEHY_FS_ID=$($DB -t -A -c "SELECT id FROM form_submissions WHERE customer_email = 'dennehyas@gmail.com' ORDER BY created_at DESC LIMIT 1;")
echo "Created form_submission ID: $DENNEHY_FS_ID"

echo ""
echo "=== INSERTING team_player for Cole Dennehy (Royal Falcons, team 10) ==="
$DB -c "INSERT INTO team_players (
  team_id, sub_team, player_name, player_email, player_phone,
  jersey_size, registration_data, payment_status
) VALUES (
  10,
  'Royal Falcons (Male - U11)',
  'Cole Dennehy',
  'dennehyas@gmail.com',
  '0832603594',
  '11/12 years',
  '{\"formSubmissionId\": \"$DENNEHY_FS_ID\", \"formId\": 2, \"parentEmail\": \"dennehyas@gmail.com\", \"parentPhone\": \"0832603594\", \"teamName\": \"Royal Falcons\", \"subTeam\": \"Royal Falcons (Male - U11)\", \"profileImage\": null, \"_recovered\": true}'::jsonb,
  'paid'
) RETURNING id, player_name;"

echo ""
echo "=== INSERTING form_submission for Vahin Mistri ==="
$DB -c "INSERT INTO form_submissions (form_id, form_name, data, customer_email, status, approval_status)
VALUES (
  '2',
  'Player Registration',
  '{\"6\": \"Vahin Mistri\", \"37\": \"Jitendra Mistri\", \"38\": \"Jbmistri@gmail.com\", \"39\": \"\", \"40\": \"0833072549\", \"25_shirtSize\": \"Medium\", \"25_pantsSize\": \"Medium\", \"_recovered\": true, \"_recoveryNote\": \"Manually recovered from order ORD1771741872622 - form submission lost due to safety net removal\", \"_cartItems\": [{\"id\": \"basic-kit\", \"name\": \"Basic Kit\", \"price\": 550, \"quantity\": 1, \"selectedSize\": \"Player 1 - Vahin Mistri | Shirt: Medium / Pants: Medium\"}, {\"id\": \"supporter_91\", \"name\": \"Winter League Cap - Supporter\", \"price\": 150, \"quantity\": 1}], \"_cartTotal\": 700}'::jsonb,
  'Jbmistri@gmail.com',
  'pending',
  'pending'
) RETURNING id;"

MISTRI_FS_ID=$($DB -t -A -c "SELECT id FROM form_submissions WHERE customer_email = 'Jbmistri@gmail.com' ORDER BY created_at DESC LIMIT 1;")
echo "Created form_submission ID: $MISTRI_FS_ID"

echo ""
echo "=== INSERTING team_player for Vahin Mistri (TEAM UNKNOWN - needs admin assignment) ==="
echo "NOTE: team_id is NULL. Admin must assign team from the admin panel."
$DB -c "INSERT INTO team_players (
  team_id, sub_team, player_name, player_email, player_phone,
  jersey_size, registration_data, payment_status
) VALUES (
  NULL,
  NULL,
  'Vahin Mistri',
  'Jbmistri@gmail.com',
  '0833072549',
  'Medium',
  '{\"formSubmissionId\": \"$MISTRI_FS_ID\", \"formId\": 2, \"parentEmail\": \"Jbmistri@gmail.com\", \"parentPhone\": \"0833072549\", \"teamName\": null, \"subTeam\": null, \"profileImage\": null, \"_recovered\": true}'::jsonb,
  'paid'
) RETURNING id, player_name;"

echo ""
echo "============================================="
echo "  POST-CHECK: Verify records were created"
echo "============================================="
echo ""
echo "--- Form Submissions ---"
$DB -c "SELECT id, customer_email, created_at FROM form_submissions WHERE customer_email IN ('dennehyas@gmail.com', 'Jbmistri@gmail.com') ORDER BY created_at DESC;"

echo ""
echo "--- Team Players ---"
$DB -c "SELECT id, team_id, player_name, player_email, jersey_size, payment_status FROM team_players WHERE player_name IN ('Cole Dennehy', 'Vahin Mistri');"

echo ""
echo "✅ Recovery complete. Cole Dennehy assigned to Royal Falcons (team 10)."
echo "⚠️  Vahin Mistri has NO team assigned (team_id NULL). Admin must assign the correct team."
