// Age Verification Email Cron
// Sends automated reminder emails to parents whose players have DOB/age issues
// Can be triggered manually from admin or run on a schedule
//
// Tracks sent emails in site_settings ('age_verification_emails_sent')
// to avoid sending duplicate reminders within 7 days

import { query } from '../../../lib/db';
import { getSmtpConfig, createTransporter } from '../../../lib/email';

const AGE_CUTOFFS = {
  'U9':  2017,
  'U11': 2015,
  'U13': 2013,
  'U15': 2011,
  'U17': 2009,
};

const RESEND_INTERVAL_DAYS = 7; // Don't re-email the same parent within 7 days

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // POST = actually send emails, GET = dry run (preview who would get emails)
  const dryRun = req.method === 'GET' || req.query.dryRun === 'true';

  try {
    const result = await runAgeVerificationEmails(dryRun);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Age verification email cron error:', error);
    return res.status(500).json({ error: 'Failed to run age verification emails', details: error.message });
  }
}

export async function runAgeVerificationEmails(dryRun = false) {
  const results = {
    dryRun,
    flaggedPlayers: 0,
    emailsToSend: 0,
    emailsSent: 0,
    emailsSkipped: 0,
    errors: [],
    details: [],
  };

  // 1. Get all player registrations with DOB/age issues
  const flagged = await getFlaggedPlayers();
  results.flaggedPlayers = flagged.length;

  if (flagged.length === 0) {
    results.details.push('No players with age verification issues found');
    return results;
  }

  // 2. Group by parent email (one email per parent, listing all their flagged players)
  const parentMap = {};
  for (const player of flagged) {
    const email = (player.email || '').toLowerCase().trim();
    if (!email) continue;
    if (!parentMap[email]) {
      parentMap[email] = {
        email,
        parentName: player.parentName,
        players: [],
        hasPaid: false,
        hasAccount: false,
      };
    }
    // Deduplicate: skip if same player name already listed for this parent
    const alreadyListed = parentMap[email].players.some(
      p => p.playerName === player.playerName && p.ageGroup === player.ageGroup
    );
    if (!alreadyListed) {
      parentMap[email].players.push(player);
    }
    if (player.paid) parentMap[email].hasPaid = true;
    if (player.hasAccount) parentMap[email].hasAccount = true;
  }

  // 3. Load email tracking to avoid re-sending too soon
  const sentTracker = await loadEmailTracker();
  const now = Date.now();
  const cutoffMs = RESEND_INTERVAL_DAYS * 24 * 60 * 60 * 1000;

  // 4. Build email list
  const emailsToSend = [];
  for (const [email, parent] of Object.entries(parentMap)) {
    const lastSent = sentTracker[email] || 0;
    if (now - lastSent < cutoffMs) {
      results.emailsSkipped++;
      results.details.push(`Skipped ${email} — last emailed ${Math.round((now - lastSent) / 86400000)}d ago`);
      continue;
    }
    emailsToSend.push(parent);
  }

  results.emailsToSend = emailsToSend.length;

  if (dryRun) {
    results.details.push('DRY RUN — no emails sent');
    for (const parent of emailsToSend) {
      results.details.push({
        email: parent.email,
        parentName: parent.parentName,
        paid: parent.hasPaid,
        hasAccount: parent.hasAccount,
        players: parent.players.map(p => ({
          name: p.playerName,
          issue: p.reason,
          dob: p.dob,
          ageGroup: p.ageGroup,
          team: p.teamName,
        })),
      });
    }
    return results;
  }

  // 5. Send emails
  const smtp = await getSmtpConfig();
  if (!smtp.host || !smtp.user || !smtp.password) {
    results.errors.push('SMTP not configured — cannot send emails');
    return results;
  }

  const transporter = createTransporter(smtp);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://winterleaguecricket.co.za';

  for (const parent of emailsToSend) {
    try {
      const { subject, html, text } = buildEmail(parent, baseUrl);

      await transporter.sendMail({
        from: `"${smtp.fromName}" <${smtp.fromEmail}>`,
        to: parent.email,
        subject,
        text,
        html,
      });

      sentTracker[parent.email] = now;
      results.emailsSent++;
      results.details.push(`Sent to ${parent.email} (${parent.players.length} player(s))`);
      console.log(`Age verification email sent to ${parent.email}`);
    } catch (err) {
      results.errors.push(`Failed to send to ${parent.email}: ${err.message}`);
      console.error(`Failed to send age verification email to ${parent.email}:`, err.message);
    }
  }

  // 6. Save updated tracker
  await saveEmailTracker(sentTracker);

  return results;
}

// ─── Query flagged players ──────────────────────────────────────────────────

async function getFlaggedPlayers() {
  const result = await query(`
    SELECT 
      fs.id,
      fs.data->>'6' as player_name,
      fs.data->>'10' as dob,
      fs.data->>'37' as parent_name,
      fs.customer_email,
      CASE 
        WHEN fs.data->>'34' IS NOT NULL AND fs.data->>'34' != '' 
        THEN (fs.data->>'34')::jsonb->>'ageGroup'
        ELSE NULL
      END as age_group,
      CASE 
        WHEN fs.data->>'34' IS NOT NULL AND fs.data->>'34' != '' 
        THEN (fs.data->>'34')::jsonb->>'teamName'
        ELSE NULL
      END as team_name,
      CASE 
        WHEN o.id IS NOT NULL AND o.payment_status = 'paid' THEN true
        ELSE false
      END as paid,
      CASE 
        WHEN c.id IS NOT NULL THEN true
        ELSE false
      END as has_account
    FROM form_submissions fs
    LEFT JOIN orders o ON LOWER(o.customer_email) = LOWER(fs.customer_email) 
      AND o.payment_status = 'paid'
    LEFT JOIN customers c ON LOWER(c.email) = LOWER(fs.customer_email)
    WHERE fs.form_id = '2'
    ORDER BY fs.created_at DESC
  `);

  const today = new Date().toISOString().slice(0, 10);
  const flagged = [];

  for (const row of result.rows) {
    const dob = row.dob || null;
    const ageGroup = (row.age_group || '').trim();
    const playerName = (row.player_name || 'Unknown').trim();

    let status = 'pass';
    let reason = '';

    if (!dob) {
      status = 'error';
      reason = 'No date of birth provided on the registration form';
    } else {
      const birthYear = parseInt(dob.substring(0, 4), 10);
      const currentYear = new Date().getFullYear();

      if (dob > today) {
        status = 'error';
        reason = `The date of birth entered (${formatDate(dob)}) is a future date — this appears to be a data entry error`;
      } else if (birthYear > currentYear - 4) {
        status = 'error';
        reason = `The date of birth entered (${formatDate(dob)}) appears to be incorrect — birth year ${birthYear} would make the player less than 4 years old`;
      } else if (birthYear < 1990) {
        status = 'error';
        reason = `Unusually old birth year (${birthYear})`;
      } else if (ageGroup && ageGroup !== 'Senior') {
        const cutoff = AGE_CUTOFFS[ageGroup];
        if (cutoff && birthYear < cutoff) {
          status = 'fail';
          reason = `Born in ${birthYear}, but the ${ageGroup} age group requires birth year ${cutoff} or later. ${playerName} is too old for ${ageGroup} by ${cutoff - birthYear} year(s)`;
        }
      }
    }

    if (status !== 'pass') {
      flagged.push({
        submissionId: row.id,
        playerName,
        dob,
        ageGroup: ageGroup || 'N/A',
        teamName: (row.team_name || 'Unknown').trim(),
        parentName: (row.parent_name || '').trim(),
        email: row.customer_email || '',
        paid: row.paid,
        hasAccount: row.has_account,
        status,
        reason,
      });
    }
  }

  return flagged;
}

// ─── Email builder ──────────────────────────────────────────────────────────

function buildEmail(parent, baseUrl) {
  const portalUrl = `${baseUrl}/parent-portal`;
  const playerCount = parent.players.length;
  const multiplePlayersLabel = playerCount > 1 ? 'players' : 'player';

  // Build player issue rows
  let playerRows = '';
  let playerRowsText = '';
  for (const p of parent.players) {
    const dobDisplay = p.dob ? formatDate(p.dob) : 'Not provided';
    playerRows += `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #eee; font-weight: bold;">${escapeHtml(p.playerName)}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #eee;">${escapeHtml(p.teamName)} (${escapeHtml(p.ageGroup)})</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #eee;">${escapeHtml(dobDisplay)}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #eee; color: #c0392b;">${escapeHtml(p.reason)}</td>
      </tr>`;
    playerRowsText += `\n  - ${p.playerName} (${p.teamName}, ${p.ageGroup}): ${p.reason}`;
  }

  const parentDisplayName = parent.parentName || 'Parent';

  let paymentNote = '';
  let paymentNoteText = '';
  if (!parent.hasPaid) {
    paymentNote = `
      <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
        <strong>⚠️ Payment Outstanding:</strong> We also notice that your registration payment has not yet been completed.
        Once you have corrected the information below, please proceed to complete payment to finalise the registration.
      </div>`;
    paymentNoteText = '\n\n⚠️ PAYMENT OUTSTANDING: We also notice that your registration payment has not yet been completed. Once you have corrected the information below, please proceed to complete payment to finalise the registration.';
  }

  let accountNote = '';
  let accountNoteText = '';
  if (!parent.hasAccount) {
    accountNote = `
      <p style="color: #666; font-size: 14px;">
        If you haven't set up your Parent Portal account yet, you can do so by visiting 
        <a href="${portalUrl}" style="color: #2c6e49;">${portalUrl}</a> and registering with the same email 
        address used during registration (<strong>${escapeHtml(parent.email)}</strong>).
      </p>`;
    accountNoteText = `\n\nIf you haven't set up your Parent Portal account yet, visit ${portalUrl} and register with the same email used during registration (${parent.email}).`;
  }

  const subject = `Action Required: Player Age Verification Issue — Winter League Cricket`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background: #f4f4f4;">
  <div style="max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <div style="background: #2c6e49; padding: 24px 32px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 22px;">Winter League Cricket</h1>
      <p style="margin: 4px 0 0; color: #a8d5ba; font-size: 14px;">Player Age Verification</p>
    </div>

    <!-- Body -->
    <div style="padding: 28px 32px;">
      <p style="font-size: 16px; color: #333;">Dear ${escapeHtml(parentDisplayName)},</p>
      
      <p style="font-size: 15px; color: #333; line-height: 1.6;">
        We are writing to let you know that there is an issue with the date of birth or age group information 
        for ${playerCount} ${multiplePlayersLabel} registered under your account. 
        <strong>Player profiles cannot be approved until this is resolved.</strong>
      </p>

      ${paymentNote}

      <!-- Player issues table -->
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
        <thead>
          <tr style="background: #f8f9fa;">
            <th style="padding: 10px 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Player</th>
            <th style="padding: 10px 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Team / Age Group</th>
            <th style="padding: 10px 12px; text-align: left; border-bottom: 2px solid #dee2e6;">DOB on File</th>
            <th style="padding: 10px 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Issue</th>
          </tr>
        </thead>
        <tbody>
          ${playerRows}
        </tbody>
      </table>

      <!-- CTA -->
      <div style="text-align: center; margin: 28px 0;">
        <a href="${portalUrl}" style="display: inline-block; background: #2c6e49; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: bold;">
          Log in to Parent Portal
        </a>
      </div>

      <p style="font-size: 15px; color: #333; line-height: 1.6;">
        Please log in to the <a href="${portalUrl}" style="color: #2c6e49; font-weight: bold;">Parent Portal</a> 
        to correct the date of birth or request an age group change. You can do this by:
      </p>
      <ol style="font-size: 14px; color: #555; line-height: 1.8;">
        <li>Log in at <a href="${portalUrl}" style="color: #2c6e49;">${portalUrl}</a></li>
        <li>Look for the <span style="color: #c0392b; font-weight: bold;">red warning banner</span> at the top of your profile</li>
        <li>Click <strong>"Correct Date of Birth"</strong> or <strong>"Change Age Group"</strong> as needed</li>
        <li>Submit the corrected information for review</li>
      </ol>

      ${accountNote}

      <p style="font-size: 14px; color: #666; line-height: 1.6; margin-top: 24px;">
        If you believe this information is correct and no changes are needed, please reply to this email 
        and we will review the matter manually.
      </p>

      <p style="font-size: 15px; color: #333; margin-top: 24px;">
        Kind regards,<br>
        <strong>Winter League Cricket</strong>
      </p>
    </div>

    <!-- Footer -->
    <div style="background: #f8f9fa; padding: 16px 32px; text-align: center; border-top: 1px solid #eee;">
      <p style="margin: 0; font-size: 12px; color: #999;">
        This is an automated message from Winter League Cricket.<br>
        If you have any questions, please reply to this email.
      </p>
    </div>
  </div>
</body>
</html>`;

  const text = `Dear ${parentDisplayName},

We are writing to let you know that there is an issue with the date of birth or age group information for ${playerCount} ${multiplePlayersLabel} registered under your account. Player profiles cannot be approved until this is resolved.
${paymentNoteText}

PLAYERS WITH ISSUES:
${playerRowsText}

HOW TO FIX:
1. Log in to the Parent Portal at ${portalUrl}
2. Look for the red warning banner at the top of your profile
3. Click "Correct Date of Birth" or "Change Age Group" as needed
4. Submit the corrected information for review
${accountNoteText}

If you believe this information is correct, please reply to this email and we will review the matter manually.

Kind regards,
Winter League Cricket`;

  return { subject, html, text };
}

// ─── Email tracker (stored in site_settings) ────────────────────────────────

async function loadEmailTracker() {
  try {
    const result = await query(
      "SELECT value FROM site_settings WHERE key = 'age_verification_emails_sent'"
    );
    if (result.rows.length > 0) {
      const raw = result.rows[0].value;
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    }
  } catch (err) {
    console.error('Error loading email tracker:', err.message);
  }
  return {};
}

async function saveEmailTracker(tracker) {
  try {
    await query(`
      INSERT INTO site_settings (id, key, value, updated_at)
      VALUES (uuid_generate_v4(), 'age_verification_emails_sent', $1::jsonb, NOW())
      ON CONFLICT (key) DO UPDATE SET value = $1::jsonb, updated_at = NOW()
    `, [JSON.stringify(tracker)]);
  } catch (err) {
    console.error('Error saving email tracker:', err.message);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
