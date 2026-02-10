// Database-only form submissions API
// Replaces in-memory storage with PostgreSQL database

import { query } from '../../lib/db';
import { getFormTemplateById } from '../../data/forms';
import nodemailer from 'nodemailer';
import { getEmailTemplate } from '../../data/adminSettings';

export default async function handler(req, res) {
  // GET - Fetch submissions
  if (req.method === 'GET') {
    try {
      const { formId, id } = req.query;
      
      // Get single submission by ID
      if (id) {
        const result = await query(
          `SELECT * FROM form_submissions WHERE id = $1`,
          [id]
        );
        
        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Submission not found' });
        }
        
        const submission = formatSubmission(result.rows[0]);
        return res.status(200).json({ submission });
      }
      
      // Get all submissions or filter by formId
      const lightweight = req.query.lightweight === 'true';
      let sql = `SELECT * FROM form_submissions`;
      const params = [];
      
      if (formId) {
        sql += ` WHERE form_id = $1`;
        params.push(formId.toString());
      }
      
      sql += ` ORDER BY created_at DESC`;
      
      const result = await query(sql, params);
      const submissions = result.rows.map(row => {
        const s = formatSubmission(row);
        if (lightweight) {
          // Strip base64 data and large values to reduce payload size
          s.data = stripHeavyData(s.data);
        }
        return s;
      });
      
      return res.status(200).json({ submissions });
      
    } catch (error) {
      console.error('Error fetching submissions:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch submissions',
        details: error.message 
      });
    }
  }

  // POST - Create new submission
  if (req.method === 'POST') {
    try {
      const { formId, data } = req.body;

      if (!formId || !data) {
        return res.status(400).json({ error: 'Form ID and data are required' });
      }

      const form = getFormTemplateById(formId);
      if (!form) {
        return res.status(404).json({ error: 'Form not found' });
      }

      // Get customer email from form data (field ID 3 for team registration)
      const customerEmail = data[3] || data['3'] || data.email || null;

      const result = await query(
        `INSERT INTO form_submissions (form_id, form_name, data, customer_email, status, approval_status)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          formId.toString(),
          form.name,
          JSON.stringify(data),
          customerEmail,
          'pending',
          'pending'
        ]
      );

      const submission = formatSubmission(result.rows[0]);

      return res.status(200).json({
        success: true,
        submission
      });

    } catch (error) {
      console.error('Form submission error:', error);
      return res.status(500).json({ 
        error: 'Failed to submit form',
        details: error.message 
      });
    }
  }

  // PUT - Update submission
  if (req.method === 'PUT') {
    try {
      const { id, status, approvalStatus, data } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Submission ID is required' });
      }

      const updates = [];
      const values = [];
      let paramCount = 1;

      if (status !== undefined) {
        updates.push(`status = $${paramCount}`);
        values.push(status);
        paramCount++;
      }

      if (approvalStatus !== undefined) {
        updates.push(`approval_status = $${paramCount}`);
        values.push(approvalStatus);
        paramCount++;
      }

      if (data !== undefined) {
        updates.push(`data = $${paramCount}`);
        values.push(JSON.stringify(data));
        paramCount++;
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      values.push(id);

      const result = await query(
        `UPDATE form_submissions 
         SET ${updates.join(', ')}
         WHERE id = $${paramCount}
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      const submission = formatSubmission(result.rows[0]);

      if (status !== undefined) {
        try {
          const statusUpdate = await query(
            `UPDATE teams SET status = $1, updated_at = CURRENT_TIMESTAMP
             WHERE form_submission_id::text = $2`,
            [status, submission.id]
          );

          if (statusUpdate.rowCount === 0 && submission?.data) {
            const fallback = extractTeamUpdatesFromSubmission(submission.data);
            if (fallback.email || fallback.teamName) {
              await query(
                `UPDATE teams SET status = $1, updated_at = CURRENT_TIMESTAMP
                 WHERE LOWER(email) = LOWER($2) OR LOWER(team_name) = LOWER($3)`,
                [status, fallback.email || '', fallback.teamName || '']
              );
            }
          }
        } catch (teamUpdateError) {
          console.error('Error updating team status from submission:', teamUpdateError);
        }
      }

      if (submission.formId === 1 && (status !== undefined || approvalStatus !== undefined)) {
        const statusToSend = approvalStatus !== undefined ? approvalStatus : status;
        try {
          await sendStatusEmailForSubmission(submission, statusToSend);
        } catch (emailError) {
          console.error('Status email error:', emailError);
        }
      }

      if (submission.formId === 1 && data !== undefined) {
        try {
          const teamUpdates = extractTeamUpdatesFromSubmission(data);
          const updateResult = await query(
            `UPDATE teams SET
              team_name = $1,
              manager_name = $2,
              manager_phone = $3,
              email = $4,
              suburb = $5,
              team_logo = $6,
              shirt_design = $7,
              primary_color = $8,
              secondary_color = $9,
              sponsor_logo = $10,
              number_of_teams = $11,
              age_group_teams = $12,
              kit_pricing = $13,
              entry_fee = $14,
              submission_data = $15,
              updated_at = CURRENT_TIMESTAMP
             WHERE form_submission_id::text = $16`,
            [
              teamUpdates.teamName,
              teamUpdates.managerName,
              teamUpdates.managerPhone,
              teamUpdates.email,
              teamUpdates.suburb,
              teamUpdates.teamLogo,
              teamUpdates.shirtDesign,
              teamUpdates.primaryColor,
              teamUpdates.secondaryColor,
              teamUpdates.sponsorLogo,
              teamUpdates.numberOfTeams,
              JSON.stringify(teamUpdates.ageGroupTeams),
              JSON.stringify(teamUpdates.kitPricing),
              JSON.stringify(teamUpdates.entryFee),
              JSON.stringify(teamUpdates.submissionData),
              submission.id
            ]
          );

          if (updateResult.rowCount === 0 && (teamUpdates.email || teamUpdates.teamName)) {
            await query(
              `UPDATE teams SET
                team_name = $1,
                manager_name = $2,
                manager_phone = $3,
                email = $4,
                suburb = $5,
                team_logo = $6,
                shirt_design = $7,
                primary_color = $8,
                secondary_color = $9,
                sponsor_logo = $10,
                number_of_teams = $11,
                age_group_teams = $12,
                kit_pricing = $13,
                entry_fee = $14,
                submission_data = $15,
                updated_at = CURRENT_TIMESTAMP
               WHERE LOWER(email) = LOWER($16) OR LOWER(team_name) = LOWER($17)`,
              [
                teamUpdates.teamName,
                teamUpdates.managerName,
                teamUpdates.managerPhone,
                teamUpdates.email,
                teamUpdates.suburb,
                teamUpdates.teamLogo,
                teamUpdates.shirtDesign,
                teamUpdates.primaryColor,
                teamUpdates.secondaryColor,
                teamUpdates.sponsorLogo,
                teamUpdates.numberOfTeams,
                JSON.stringify(teamUpdates.ageGroupTeams),
                JSON.stringify(teamUpdates.kitPricing),
                JSON.stringify(teamUpdates.entryFee),
                JSON.stringify(teamUpdates.submissionData),
                teamUpdates.email || '',
                teamUpdates.teamName || ''
              ]
            );
          }
        } catch (teamUpdateError) {
          console.error('Error updating team data from submission:', teamUpdateError);
        }
      }

      return res.status(200).json({ success: true, submission });

    } catch (error) {
      console.error('Error updating submission:', error);
      return res.status(500).json({ 
        error: 'Failed to update submission',
        details: error.message 
      });
    }
  }

  // DELETE - Delete submission(s)
  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      const body = req.body || {};

      // Delete all submissions if deleteAll flag is set
      if (body.deleteAll === true) {
        await query(`DELETE FROM form_submissions`);
        return res.status(200).json({ success: true, message: 'All submissions deleted' });
      }

      if (!id) {
        return res.status(400).json({ error: 'Submission ID is required' });
      }

      const result = await query(
        `DELETE FROM form_submissions WHERE id = $1 RETURNING id`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      return res.status(200).json({ success: true, deletedId: id });

    } catch (error) {
      console.error('Error deleting submission:', error);
      return res.status(500).json({ 
        error: 'Failed to delete submission',
        details: error.message 
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

function normalizeTemplateStatus(status) {
  if (!status) return 'pending';
  const normalized = String(status).toLowerCase();
  if (normalized === 'completed') return 'complete';
  if (normalized === 'approved') return 'complete';
  return normalized;
}

function extractTeamUpdatesFromSubmission(data) {
  const baseRaw = data['29_basePrice'] ?? data["29_basePrice"];
  const markupRaw = data['29_markup'] ?? data["29_markup"];
  const basePrice = Number.isFinite(parseFloat(baseRaw)) ? parseFloat(baseRaw) : 150;
  const markup = Number.isFinite(parseFloat(markupRaw)) ? parseFloat(markupRaw) : 0;
  const entryRaw = data['31_baseFee'] ?? data["31_baseFee"];
  const baseFee = Number.isFinite(parseFloat(entryRaw)) ? parseFloat(entryRaw) : 500;

  return {
    teamName: data['1'] || data[1] || data.teamName || '',
    managerName: data['2'] || data[2] || data.managerName || '',
    managerPhone: data['35'] || data[35] || data.managerPhone || '',
    email: data['3'] || data[3] || data.email || '',
    suburb: data['5'] || data[5] || data.suburb || '',
    teamLogo: data['22'] || data[22] || data.teamLogo || '',
    shirtDesign: data['23'] || data[23] || data.shirtDesign || '',
    primaryColor: data['23_primaryColor'] || data.primaryColor || '',
    secondaryColor: data['23_secondaryColor'] || data.secondaryColor || '',
    sponsorLogo: data['30'] || data[30] || data.sponsorLogo || '',
    numberOfTeams: parseInt(data['32'] || data[32] || data.numberOfTeams || 1, 10),
    ageGroupTeams: data['33'] || data[33] || data.ageGroupTeams || [],
    kitPricing: { basePrice, markup },
    entryFee: { baseFee },
    submissionData: data
  };
}

async function sendStatusEmailForSubmission(submission, status) {
  const templateKey = normalizeTemplateStatus(status);
  if (!['reviewed', 'complete'].includes(templateKey)) {
    return { skipped: true, reason: 'Status does not require email' };
  }

  const template = getEmailTemplate(templateKey);
  if (!template || !template.subject || !template.body) {
    return { skipped: true, reason: 'Template not found' };
  }

  const data = submission.data || {};
  const teamName = data['Team Name'] || data[1] || data['1'] || 'Your Team';
  const coachName = data['Coach Name'] || data[2] || data['2'] || 'Coach';
  const teamEmail = data['Team Email'] || data[3] || data['3'] || submission.customerEmail || '';

  if (!teamEmail) {
    return { skipped: true, reason: 'Missing team email' };
  }

  let password = '';
  try {
    const submissionId = submission.id;
    let teamResult = await query(
      `SELECT password FROM teams WHERE form_submission_uuid = $1`,
      [submissionId]
    );

    if (teamResult.rows.length === 0 && typeof submissionId === 'string' && /^[0-9]+$/.test(submissionId)) {
      teamResult = await query(
        `SELECT password FROM teams WHERE form_submission_id = $1`,
        [parseInt(submissionId, 10)]
      );
    }

    if (teamResult.rows.length === 0 && (teamEmail || teamName)) {
      teamResult = await query(
        `SELECT password FROM teams WHERE LOWER(email) = LOWER($1) OR LOWER(team_name) = LOWER($2) LIMIT 1`,
        [teamEmail || '', teamName || '']
      );
    }

    if (teamResult.rows.length > 0) {
      const row = teamResult.rows[0];
      password = row.password || '';
    }
  } catch (error) {
    console.log('Could not load team password for email:', error.message);
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://winterleaguecricket.co.za';
  const loginUrl = `${baseUrl}/team-portal`;

  const shortRegistrationId = String(submission.id || '').slice(-4);
  const variables = {
    '{teamName}': teamName,
    '{coachName}': coachName,
    '{registrationId}': shortRegistrationId,
    '{email}': teamEmail,
    '{password}': password,
    '{loginUrl}': loginUrl
  };

  let subject = template.subject;
  let body = template.body;
  Object.entries(variables).forEach(([key, value]) => {
    const escaped = key.replace(/[{}]/g, '\\$&');
    subject = subject.replace(new RegExp(escaped, 'g'), value);
    body = body.replace(new RegExp(escaped, 'g'), value);
  });

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;
  const rawFromEmail = process.env.SMTP_FROM_EMAIL;
  const fromEmail = rawFromEmail && rawFromEmail.includes('@') ? rawFromEmail : user;
  const fromName = process.env.SMTP_FROM_NAME || 'Winter League Cricket';

  if (!host || !user || !smtpPassword) {
    console.log('=== STATUS EMAIL (Development Mode) ===');
    console.log('To:', teamEmail);
    console.log('Subject:', subject);
    console.log('========================================');
    return { success: true, devMode: true };
  }

  const transporter = nodemailer.createTransport({
    host: host,
    port: parseInt(port || '465'),
    secure: parseInt(port || '465') === 465,
    auth: {
      user: user,
      pass: smtpPassword
    }
  });

  await transporter.verify();

  const info = await transporter.sendMail({
    from: `"${fromName}" <${fromEmail || user}>`,
    to: teamEmail,
    subject,
    text: body,
    html: body.replace(/\n/g, '<br>')
  });

  console.log('Status email sent:', info.messageId);
  return { success: true, messageId: info.messageId };
}

// Strip base64 images and large string values from submission data to reduce payload
function stripHeavyData(data) {
  if (!data || typeof data !== 'object') return data;
  const stripped = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string' && (value.startsWith('data:') || value.length > 5000)) {
      continue; // Skip base64 images and very large strings
    }
    if (Array.isArray(value)) {
      // For player entries arrays, strip images from each entry
      stripped[key] = value.map(item => {
        if (item && typeof item === 'object') {
          const clean = {};
          for (const [k, v] of Object.entries(item)) {
            if (typeof v === 'string' && (v.startsWith('data:') || v.length > 5000)) continue;
            clean[k] = v;
          }
          return clean;
        }
        return item;
      });
    } else {
      stripped[key] = value;
    }
  }
  return stripped;
}

// Helper to format database row to consistent submission object
function formatSubmission(row) {
  return {
    id: row.id,
    shortId: String(row.id || '').slice(-4),
    formId: parseInt(row.form_id) || 1,
    formName: row.form_name,
    data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
    customerEmail: row.customer_email,
    status: row.status || 'pending',
    approvalStatus: row.approval_status || 'pending',
    submittedAt: row.created_at,
    updatedAt: row.updated_at
  };
}
