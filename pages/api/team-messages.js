// Team messages API
import { query } from '../../lib/db';

export default async function handler(req, res) {
  // PUT - Mark message as read
  if (req.method === 'PUT') {
    try {
      const { messageId } = req.body;

      if (!messageId) {
        return res.status(400).json({ error: 'Message ID is required' });
      }

      const result = await query(
        `UPDATE team_messages SET is_read = TRUE WHERE id = $1 RETURNING *`,
        [messageId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Message not found' });
      }

      return res.status(200).json({ success: true });

    } catch (error) {
      console.error('Error updating message:', error);
      return res.status(500).json({ error: 'Failed to update message', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
