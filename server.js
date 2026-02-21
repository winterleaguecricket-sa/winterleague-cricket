const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const fs = require('fs')
const path = require('path')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = process.env.PORT || 3001

// ============================================================
// Persistent structured logger (file-based, survives PM2 restarts)
// ============================================================
const LOG_DIR = path.join(__dirname, 'logs')
const MAX_LOG_SIZE = 5 * 1024 * 1024 // 5MB per file
const MAX_LOG_FILES = 10

try {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true })
  }
} catch (e) {
  console.error('Failed to create logs directory:', e.message)
}

function rotateIfNeeded(logPath) {
  try {
    if (!fs.existsSync(logPath)) return
    const stats = fs.statSync(logPath)
    if (stats.size < MAX_LOG_SIZE) return
    for (let i = MAX_LOG_FILES - 1; i >= 1; i--) {
      const older = `${logPath}.${i}`
      const newer = i === 1 ? logPath : `${logPath}.${i - 1}`
      if (fs.existsSync(newer)) {
        try { fs.renameSync(newer, older) } catch (e) { /* skip */ }
      }
    }
  } catch (e) { /* don't break on rotation errors */ }
}

function writeStructuredLog(logName, entry) {
  try {
    const logPath = path.join(LOG_DIR, `${logName}.log`)
    rotateIfNeeded(logPath)
    fs.appendFileSync(logPath, JSON.stringify(entry) + '\n', 'utf8')
  } catch (e) {
    console.error(`Logger write failed (${logName}):`, e.message)
  }
}

// Legacy-compatible log function + structured file logging
function logWithTimestamp(level, message, error = null) {
  const timestamp = new Date().toISOString()
  const logMessage = `[${timestamp}] [${level}] [pid:${process.pid}] ${message}`
  
  if (level === 'ERROR' || level === 'FATAL') {
    console.error(logMessage)
    if (error && error.stack) {
      console.error(error.stack)
    }
    // Write structured JSON to app-errors log
    writeStructuredLog('app-errors', {
      timestamp,
      level,
      type: level === 'FATAL' ? 'fatal_error' : 'app_error',
      message,
      error: error?.message || null,
      stack: error?.stack || null,
      pid: process.pid
    })
  } else {
    console.log(logMessage)
  }

  // Write startup/shutdown events to server log
  if (level === 'INFO') {
    writeStructuredLog('server', {
      timestamp,
      level: 'INFO',
      type: 'server_event',
      message,
      pid: process.pid,
      nodeVersion: process.version,
      env: process.env.NODE_ENV || 'development'
    })
  }
}

// ============================================================
// Process error handlers
// ============================================================

process.on('uncaughtException', (err) => {
  logWithTimestamp('FATAL', `Uncaught Exception: ${err.message}`, err)
  setTimeout(() => process.exit(1), 1000)
})

process.on('unhandledRejection', (reason, promise) => {
  const err = reason instanceof Error ? reason : new Error(String(reason))
  logWithTimestamp('ERROR', `Unhandled Rejection: ${err.message}`, err)
})

process.on('SIGTERM', () => {
  logWithTimestamp('INFO', 'Received SIGTERM signal, shutting down gracefully...')
})

process.on('SIGINT', () => {
  logWithTimestamp('INFO', 'Received SIGINT signal, shutting down gracefully...')
})

// ============================================================
// Server
// ============================================================

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  logWithTimestamp('INFO', `Starting server on port ${port} (pid: ${process.pid})...`)
  
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      logWithTimestamp('ERROR', `Request error: ${req.method} ${req.url}`, err)
      // Also write to api-errors with request context
      writeStructuredLog('api-errors', {
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        type: 'request_error',
        method: req.method,
        url: req.url,
        error: err?.message || String(err),
        stack: err?.stack || null,
        userAgent: req.headers?.['user-agent'] || null,
        pid: process.pid
      })
      if (!res.headersSent) {
        res.statusCode = 500
        res.end('internal server error')
      }
    }
  })
    .once('error', (err) => {
      logWithTimestamp('FATAL', `Server failed to start: ${err.message}`, err)
      process.exit(1)
    })
    .listen(port, () => {
      logWithTimestamp('INFO', `Winter League Cricket ready on http://${hostname}:${port}`)

      // ============================================================
      // Automatic Payment Reconciliation (every 5 minutes)
      // Catches orphaned payments when server restarts during checkout
      // ============================================================
      const RECONCILE_INTERVAL = 5 * 60 * 1000 // 5 minutes
      const reconcileUrl = `http://${hostname}:${port}/api/cron/reconcile-payments?secret=wlc-reconcile-2024`

      // Wait 30 seconds after startup before first reconciliation
      // (gives the server time to fully warm up)
      setTimeout(() => {
        logWithTimestamp('INFO', 'Starting payment reconciliation scheduler (every 5 min)')

        // Run immediately on first tick (catches anything missed during downtime)
        fetch(reconcileUrl).catch(err => {
          logWithTimestamp('ERROR', `Initial reconciliation failed: ${err.message}`)
        })

        // Then run every 5 minutes
        setInterval(() => {
          fetch(reconcileUrl).catch(err => {
            logWithTimestamp('ERROR', `Scheduled reconciliation failed: ${err.message}`)
          })
        }, RECONCILE_INTERVAL)
      }, 30000)
    })
}).catch((err) => {
  logWithTimestamp('FATAL', `Failed to prepare Next.js app: ${err.message}`, err)
  process.exit(1)
})
