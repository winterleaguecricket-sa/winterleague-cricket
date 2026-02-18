// Persistent structured error logger
// Writes to rotating log files that survive PM2 restarts
// Logs are JSON-formatted for easy parsing and admin viewing

import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');
const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5MB per file before rotation
const MAX_LOG_FILES = 10; // Keep last 10 rotated files

// Ensure logs directory exists
try {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
} catch (e) {
  console.error('Failed to create logs directory:', e.message);
}

function getLogPath(name) {
  return path.join(LOG_DIR, `${name}.log`);
}

// Rotate log file if it exceeds MAX_LOG_SIZE
function rotateIfNeeded(logPath) {
  try {
    if (!fs.existsSync(logPath)) return;
    const stats = fs.statSync(logPath);
    if (stats.size < MAX_LOG_SIZE) return;

    // Shift existing rotated files
    for (let i = MAX_LOG_FILES - 1; i >= 1; i--) {
      const older = `${logPath}.${i}`;
      const newer = `${logPath}.${i - 1}`;
      if (i === 1) {
        // Rename current to .1
        if (fs.existsSync(logPath)) {
          try { fs.renameSync(logPath, `${logPath}.1`); } catch (e) { /* skip */ }
        }
      } else {
        if (fs.existsSync(newer)) {
          try { fs.renameSync(newer, older); } catch (e) { /* skip */ }
        }
      }
    }
  } catch (e) {
    // Don't let rotation errors break logging
  }
}

// Write a structured log entry to a specific log file
function writeLog(logName, entry) {
  try {
    const logPath = getLogPath(logName);
    rotateIfNeeded(logPath);
    const line = JSON.stringify(entry) + '\n';
    fs.appendFileSync(logPath, line, 'utf8');
  } catch (e) {
    console.error(`Logger write failed (${logName}):`, e.message);
  }
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Log an API error with full context
 */
export function logApiError({ method, url, statusCode, error, body, query, duration, userAgent }) {
  const entry = {
    timestamp: new Date().toISOString(),
    level: 'ERROR',
    type: 'api_error',
    method: method || 'UNKNOWN',
    url: url || 'UNKNOWN',
    statusCode: statusCode || 500,
    error: typeof error === 'string' ? error : (error?.message || String(error)),
    stack: error?.stack || null,
    body: sanitizeBody(body),
    query: query || null,
    duration: duration || null,
    userAgent: userAgent || null,
    pid: process.pid
  };
  writeLog('api-errors', entry);
  // Also console.error so PM2 captures it
  console.error(`[API ERROR] ${method} ${url} ${statusCode}: ${entry.error}`);
}

/**
 * Log a general application error
 */
export function logAppError(message, error, context = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level: 'ERROR',
    type: 'app_error',
    message,
    error: error?.message || String(error || ''),
    stack: error?.stack || null,
    context,
    pid: process.pid
  };
  writeLog('app-errors', entry);
  console.error(`[APP ERROR] ${message}: ${entry.error}`);
}

/**
 * Log a form submission event (for analytics without GA)
 */
export function logFormEvent({ formId, formName, email, action, details }) {
  const entry = {
    timestamp: new Date().toISOString(),
    type: 'form_event',
    formId,
    formName: formName || (formId === 1 ? 'Team Registration' : formId === 2 ? 'Player Registration' : `Form ${formId}`),
    email: email || null,
    action: action || 'submit',
    details: details || null,
    pid: process.pid
  };
  writeLog('form-events', entry);
}

/**
 * Log a payment/order event
 */
export function logPaymentEvent({ orderId, email, amount, gateway, status, details }) {
  const entry = {
    timestamp: new Date().toISOString(),
    type: 'payment_event',
    orderId,
    email,
    amount,
    gateway,
    status,
    details: details || null,
    pid: process.pid
  };
  writeLog('payment-events', entry);
}

/**
 * Log server startup info
 */
export function logStartup(message) {
  const entry = {
    timestamp: new Date().toISOString(),
    level: 'INFO',
    type: 'startup',
    message,
    pid: process.pid,
    nodeVersion: process.version,
    env: process.env.NODE_ENV || 'development'
  };
  writeLog('server', entry);
  console.log(`[STARTUP] ${message}`);
}

/**
 * Read recent error logs for admin viewing
 * @param {string} logName - 'api-errors', 'app-errors', 'form-events', 'payment-events', 'server'
 * @param {number} limit - max entries to return (most recent first)
 */
export function readRecentLogs(logName, limit = 50) {
  try {
    const logPath = getLogPath(logName);
    if (!fs.existsSync(logPath)) return [];

    const content = fs.readFileSync(logPath, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);
    
    // Return most recent entries first
    const entries = [];
    const start = Math.max(0, lines.length - limit);
    for (let i = lines.length - 1; i >= start; i--) {
      try {
        entries.push(JSON.parse(lines[i]));
      } catch (e) {
        entries.push({ raw: lines[i], parseError: true });
      }
    }
    return entries;
  } catch (e) {
    return [{ error: `Failed to read ${logName}: ${e.message}` }];
  }
}

/**
 * Get log file sizes and metadata
 */
export function getLogStats() {
  const logFiles = ['api-errors', 'app-errors', 'form-events', 'payment-events', 'server'];
  const stats = {};
  for (const name of logFiles) {
    const logPath = getLogPath(name);
    try {
      if (fs.existsSync(logPath)) {
        const fstat = fs.statSync(logPath);
        stats[name] = {
          size: fstat.size,
          sizeHuman: formatBytes(fstat.size),
          modified: fstat.mtime.toISOString(),
          lines: fs.readFileSync(logPath, 'utf8').split('\n').filter(Boolean).length
        };
      } else {
        stats[name] = { size: 0, sizeHuman: '0 B', lines: 0 };
      }
    } catch (e) {
      stats[name] = { error: e.message };
    }
  }
  return stats;
}

// Helpers
function sanitizeBody(body) {
  if (!body) return null;
  const safe = { ...body };
  // Remove sensitive fields
  if (safe.password) safe.password = '***';
  if (safe.password_hash) safe.password_hash = '***';
  // Truncate large base64 data
  for (const key of Object.keys(safe)) {
    if (typeof safe[key] === 'string' && safe[key].length > 1000) {
      safe[key] = safe[key].substring(0, 100) + `... [truncated ${safe[key].length} chars]`;
    }
  }
  return safe;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
