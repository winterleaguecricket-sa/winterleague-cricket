/**
 * Migration script: Convert base64 images in teams table to file URLs
 * 
 * Affects:
 *   - teams.team_logo (base64 → file URL)
 *   - teams.submission_data->>'22' (team logo, base64 → file URL)
 *   - teams.submission_data->>'30' (sponsor logo, base64 → file URL)
 *   - form_submissions.data->>'22' and ->>'30' (same fields, kept in sync)
 * 
 * Run on the production server: node migrate-base64-to-files.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: '127.0.0.1',
  user: 'winterleague_user',
  password: 'Bailey&Love2015!',
  database: 'winterleague_cricket',
});

const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads', 'team-logos');
const URL_PREFIX = '/uploads/team-logos';

function getExtFromBase64(dataUri) {
  // data:image/png;base64,... → png
  const match = dataUri.match(/^data:image\/(\w+);base64,/);
  if (match) return match[1] === 'jpeg' ? 'jpg' : match[1];
  return 'png'; // fallback
}

function saveBase64ToFile(dataUri, filename) {
  const base64Data = dataUri.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  const filePath = path.join(UPLOAD_DIR, filename);
  fs.writeFileSync(filePath, buffer);
  return `${URL_PREFIX}/${filename}`;
}

async function migrate() {
  // Ensure upload directory exists
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  const client = await pool.connect();
  try {
    const { rows: teams } = await client.query(
      `SELECT id, team_name, team_logo, submission_data, form_submission_id, form_submission_uuid
       FROM teams ORDER BY id`
    );

    console.log(`Found ${teams.length} teams to check\n`);

    let converted = 0;

    for (const team of teams) {
      const updates = {};
      const subDataUpdates = {};
      const teamSlug = team.team_name
        ? team.team_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        : `team-${team.id}`;

      // 1. Check team_logo column
      if (team.team_logo && team.team_logo.startsWith('data:image')) {
        const ext = getExtFromBase64(team.team_logo);
        const filename = `${teamSlug}-logo.${ext}`;
        const url = saveBase64ToFile(team.team_logo, filename);
        updates.team_logo = url;
        console.log(`  [team ${team.id}] team_logo → ${filename} (${(team.team_logo.length / 1024).toFixed(0)}KB base64 → file)`);
      }

      // 2. Check submission_data field 22 (team logo)
      const sd = team.submission_data || {};
      if (sd['22'] && typeof sd['22'] === 'string' && sd['22'].startsWith('data:image')) {
        const ext = getExtFromBase64(sd['22']);
        const filename = `${teamSlug}-logo.${ext}`;
        // If we already saved team_logo with same data, just use the same URL
        const url = updates.team_logo || saveBase64ToFile(sd['22'], filename);
        subDataUpdates['22'] = url;
        console.log(`  [team ${team.id}] submission_data.22 → ${url}`);
      }

      // 3. Check submission_data field 30 (sponsor logo)
      if (sd['30'] && typeof sd['30'] === 'string' && sd['30'].startsWith('data:image')) {
        const ext = getExtFromBase64(sd['30']);
        const filename = `${teamSlug}-sponsor.${ext}`;
        const url = saveBase64ToFile(sd['30'], filename);
        subDataUpdates['30'] = url;
        console.log(`  [team ${team.id}] submission_data.30 → ${filename} (${(sd['30'].length / 1024).toFixed(0)}KB base64 → file)`);
      }

      // Apply updates
      if (Object.keys(updates).length > 0 || Object.keys(subDataUpdates).length > 0) {
        await client.query('BEGIN');
        try {
          // Update team_logo column
          if (updates.team_logo) {
            await client.query(
              `UPDATE teams SET team_logo = $1, updated_at = NOW() WHERE id = $2`,
              [updates.team_logo, team.id]
            );
          }

          // Update submission_data fields using jsonb_set
          for (const [field, url] of Object.entries(subDataUpdates)) {
            await client.query(
              `UPDATE teams SET submission_data = jsonb_set(COALESCE(submission_data, '{}')::jsonb, $1, $2::jsonb), updated_at = NOW() WHERE id = $3`,
              [`{${field}}`, JSON.stringify(url), team.id]
            );
          }

          // Also update linked form_submission
          const fsId = team.form_submission_id || team.form_submission_uuid;
          if (fsId && Object.keys(subDataUpdates).length > 0) {
            for (const [field, url] of Object.entries(subDataUpdates)) {
              await client.query(
                `UPDATE form_submissions SET data = jsonb_set(COALESCE(data, '{}')::jsonb, $1, $2::jsonb), updated_at = NOW() WHERE id = $3`,
                [`{${field}}`, JSON.stringify(url), fsId]
              );
            }
            console.log(`  [team ${team.id}] form_submission ${fsId} also updated`);
          }

          await client.query('COMMIT');
          converted++;
        } catch (err) {
          await client.query('ROLLBACK');
          console.error(`  [team ${team.id}] ERROR - rolled back:`, err.message);
        }
      }
    }

    console.log(`\nDone! Converted ${converted} teams from base64 to file URLs.`);

    // Verify
    const { rows: verify } = await client.query(
      `SELECT id, team_name, 
        CASE WHEN team_logo LIKE 'data:image%' THEN 'STILL BASE64' ELSE COALESCE(team_logo, 'null') END as logo_status,
        length(submission_data::text) as sd_size
       FROM teams WHERE team_logo LIKE 'data:image%' OR submission_data::text LIKE '%data:image%'`
    );
    if (verify.length === 0) {
      console.log('Verification: No base64 images remaining in database!');
    } else {
      console.log(`WARNING: ${verify.length} teams still have base64 data:`);
      verify.forEach(r => console.log(`  - ${r.id} ${r.team_name}: ${r.logo_status}`));
    }

  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
