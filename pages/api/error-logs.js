// Admin API endpoint to view error logs
// GET /api/error-logs?log=api-errors&limit=50
// GET /api/error-logs?stats=true

import { readRecentLogs, getLogStats } from '../../lib/logger';

const VALID_LOGS = ['api-errors', 'app-errors', 'form-events', 'payment-events', 'server'];

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Basic admin check - require admin cookie
  const adminAuth = req.cookies?.winterleague_admin;
  if (!adminAuth) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Return stats for all log files
  if (req.query.stats === 'true') {
    const stats = getLogStats();
    return res.status(200).json({ success: true, stats });
  }

  // Return recent entries from a specific log
  const logName = req.query.log || 'api-errors';
  if (!VALID_LOGS.includes(logName)) {
    return res.status(400).json({ error: `Invalid log name. Valid: ${VALID_LOGS.join(', ')}` });
  }

  const limit = Math.min(parseInt(req.query.limit) || 50, 500);
  const entries = readRecentLogs(logName, limit);

  return res.status(200).json({
    success: true,
    log: logName,
    count: entries.length,
    entries
  });
}
