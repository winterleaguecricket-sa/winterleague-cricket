import { query } from '../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { submissionId, status, approvalStatus } = req.body;

    if (!submissionId) {
      return res.status(400).json({ error: 'Submission ID is required' });
    }

    // Build update query based on what fields were provided
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

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No status fields provided to update' });
    }

    values.push(submissionId);

    const result = await query(
      `UPDATE form_submissions 
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    return res.status(200).json({
      success: true,
      submission: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating submission status:', error);
    return res.status(500).json({ 
      error: 'Failed to update submission status',
      details: error.message 
    });
  }
}
