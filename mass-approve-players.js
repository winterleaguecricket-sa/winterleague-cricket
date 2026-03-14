// Mass approve players who are: (1) PAID, (2) PASS age verification, (3) NO data errors
// Usage:
//   node mass-approve-players.js --dry-run    (SAFE: shows who would be approved, no changes)
//   node mass-approve-players.js --execute    (LIVE: approves + sends emails)

const { Pool } = require('pg');
const http = require('http');

const pool = new Pool({
  host: 'localhost',
  user: 'winterleague_user',
  password: 'Bailey&Love2015!',
  database: 'winterleague_cricket',
});

// ── Age verification (same logic as pages/api/age-verification.js) ──
const AGE_CUTOFFS = { U9: 2017, U11: 2015, U13: 2013, U15: 2011, U17: 2009 };

function checkAge(dob, ageGroup, gender) {
  const today = new Date().toISOString().slice(0, 10);
  if (!dob || dob.trim() === '') return { status: 'error', reason: 'No DOB provided' };
  const birthYear = parseInt(dob.substring(0, 4), 10);
  if (isNaN(birthYear)) return { status: 'error', reason: 'Invalid DOB format' };
  if (dob > today) return { status: 'error', reason: `Future DOB (${dob})` };
  if (birthYear > new Date().getFullYear() - 4) return { status: 'error', reason: `Birth year ${birthYear} too recent` };
  if (birthYear < 1990) return { status: 'error', reason: `Birth year ${birthYear} too old` };
  if (!ageGroup || ageGroup.trim() === '') return { status: 'error', reason: 'No age group assigned' };
  if (ageGroup === 'Senior') return { status: 'pass', reason: 'Senior - no restriction' };
  const base = AGE_CUTOFFS[ageGroup];
  if (!base) return { status: 'error', reason: `Unknown age group: ${ageGroup}` };
  const isFemale = ['female', 'girls'].includes((gender || '').toLowerCase());
  const cutoff = isFemale ? base - 2 : base;
  if (birthYear < cutoff) return { status: 'fail', reason: `Born ${birthYear}, ${ageGroup} requires >=${cutoff}${isFemale ? ' (female grace)' : ''}` };
  return { status: 'pass', reason: '' };
}

// ── HTTP helper to call the submissions API (triggers email) ──
function callApprovalApi(submissionId) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ id: submissionId, approvalStatus: 'approved' });
    const req = http.request({
      hostname: 'localhost', port: 3001, path: '/api/submissions',
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ httpStatus: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ httpStatus: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function run() {
  const mode = process.argv[2];
  if (mode !== '--dry-run' && mode !== '--execute') {
    console.log('Usage:');
    console.log('  node mass-approve-players.js --dry-run    (preview only, no changes)');
    console.log('  node mass-approve-players.js --execute    (approve + send emails)');
    process.exit(1);
  }
  const dryRun = mode === '--dry-run';

  console.log(`\n========================================`);
  console.log(`  MASS PLAYER APPROVAL - ${dryRun ? 'DRY RUN (no changes)' : 'LIVE EXECUTION'}`);
  console.log(`  Date: ${new Date().toISOString()}`);
  console.log(`========================================\n`);

  // ── STEP 1: Get all pending player registrations that have a PAID order ──
  console.log('STEP 1: Querying paid + pending player registrations...');
  const paidPending = await pool.query(`
    SELECT 
      fs.id,
      fs.data->>'6' as player_name,
      fs.data->>'10' as dob,
      fs.data->>'37' as parent_name,
      fs.data->>'38' as parent_email,
      fs.customer_email,
      fs.approval_status,
      CASE 
        WHEN fs.data->>'34' IS NOT NULL AND fs.data->>'34' != '' 
        THEN (fs.data->>'34')::jsonb->>'ageGroup' ELSE NULL
      END as age_group,
      CASE 
        WHEN fs.data->>'34' IS NOT NULL AND fs.data->>'34' != '' 
        THEN (fs.data->>'34')::jsonb->>'teamName' ELSE NULL
      END as team_name,
      CASE 
        WHEN fs.data->>'34' IS NOT NULL AND fs.data->>'34' != '' 
        THEN (fs.data->>'34')::jsonb->>'gender' ELSE NULL
      END as gender
    FROM form_submissions fs
    WHERE fs.form_id = '2'
      AND fs.approval_status = 'pending'
      AND fs.status = 'pending'
      AND EXISTS (
        SELECT 1 FROM orders o
        WHERE LOWER(o.customer_email) = LOWER(fs.customer_email)
          AND o.payment_status = 'paid'
      )
    ORDER BY fs.created_at ASC
  `);
  console.log(`  Found ${paidPending.rows.length} paid + pending players\n`);

  // ── STEP 2: Apply age verification check to each player ──
  console.log('STEP 2: Running age verification on each player...');
  const eligible = [];
  const excludedFail = [];
  const excludedError = [];

  for (const row of paidPending.rows) {
    const ageGroup = (row.age_group || '').trim();
    const gender = (row.gender || '').trim();
    const dob = (row.dob || '').trim();
    const check = checkAge(dob, ageGroup, gender);

    if (check.status === 'pass') {
      eligible.push({
        id: row.id,
        playerName: (row.player_name || 'Unknown').trim(),
        dob: dob,
        ageGroup: ageGroup || 'N/A',
        teamName: (row.team_name || 'Unknown').trim(),
        parentEmail: row.parent_email || row.customer_email,
      });
    } else if (check.status === 'fail') {
      excludedFail.push({ name: (row.player_name || '').trim(), reason: check.reason, team: (row.team_name || '').trim() });
    } else {
      excludedError.push({ name: (row.player_name || '').trim(), reason: check.reason, team: (row.team_name || '').trim() });
    }
  }

  // ── STEP 3: Print summary ──
  console.log(`\n╔══════════════════════════════════════╗`);
  console.log(`║       ELIGIBILITY SUMMARY            ║`);
  console.log(`╠══════════════════════════════════════╣`);
  console.log(`║  Total paid + pending:   ${String(paidPending.rows.length).padStart(5)}      ║`);
  console.log(`║  ✅ PASS (eligible):     ${String(eligible.length).padStart(5)}      ║`);
  console.log(`║  ❌ FAIL (age too old):  ${String(excludedFail.length).padStart(5)}      ║`);
  console.log(`║  ⚠️  ERROR (data issue):  ${String(excludedError.length).padStart(5)}      ║`);
  console.log(`╚══════════════════════════════════════╝\n`);

  if (excludedFail.length > 0) {
    console.log('── Excluded (Age Fail) ──');
    excludedFail.forEach(p => console.log(`  ❌ ${p.name} | ${p.team} | ${p.reason}`));
    console.log('');
  }

  if (excludedError.length > 0) {
    console.log('── Excluded (Data Error) ──');
    excludedError.forEach(p => console.log(`  ⚠️  ${p.name} | ${p.team} | ${p.reason}`));
    console.log('');
  }

  // ── Verification double-check ──
  const totalAccounted = eligible.length + excludedFail.length + excludedError.length;
  if (totalAccounted !== paidPending.rows.length) {
    console.error(`INTEGRITY CHECK FAILED: ${totalAccounted} accounted != ${paidPending.rows.length} total. Aborting.`);
    process.exit(1);
  }
  console.log(`✓ Integrity check passed: ${eligible.length} + ${excludedFail.length} + ${excludedError.length} = ${totalAccounted}\n`);

  if (eligible.length === 0) {
    console.log('No eligible players to approve.');
    await pool.end();
    return;
  }

  if (dryRun) {
    console.log('═══ DRY RUN COMPLETE ═══');
    console.log(`Would approve ${eligible.length} players and send Player Approved emails.`);
    console.log(`Would NOT touch the ${excludedFail.length + excludedError.length} excluded players.`);
    console.log('\nTo execute for real, run:  node mass-approve-players.js --execute');
    await pool.end();
    return;
  }

  // ── STEP 4: Execute approvals via the submissions API (triggers email) ──
  console.log(`═══ EXECUTING: Approving ${eligible.length} players + sending emails ═══\n`);

  let approved = 0;
  let errors = 0;

  for (let i = 0; i < eligible.length; i++) {
    const player = eligible[i];
    try {
      const res = await callApprovalApi(player.id);
      if (res.httpStatus === 200) {
        approved++;
      } else {
        errors++;
        console.error(`  ERROR [${player.playerName}] (${player.id}): HTTP ${res.httpStatus} - ${JSON.stringify(res.body)}`);
      }
    } catch (err) {
      errors++;
      console.error(`  EXCEPTION [${player.playerName}]: ${err.message}`);
    }

    // Progress log every 50 players
    if ((i + 1) % 50 === 0 || i === eligible.length - 1) {
      console.log(`  Progress: ${i + 1}/${eligible.length} — approved: ${approved}, errors: ${errors}`);
    }

    // Throttle: 200ms pause every 5 requests to not overwhelm SMTP
    if ((i + 1) % 5 === 0) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  console.log(`\n╔══════════════════════════════════════╗`);
  console.log(`║         FINAL RESULTS                ║`);
  console.log(`╠══════════════════════════════════════╣`);
  console.log(`║  Successfully approved:  ${String(approved).padStart(5)}      ║`);
  console.log(`║  Errors:                 ${String(errors).padStart(5)}      ║`);
  console.log(`║  Skipped (fail+error):   ${String(excludedFail.length + excludedError.length).padStart(5)}      ║`);
  console.log(`╚══════════════════════════════════════╝`);

  await pool.end();
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });
