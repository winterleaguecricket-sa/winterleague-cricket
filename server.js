const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const fs = require('fs')
const path = require('path')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = process.env.PORT || 3001

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs')
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true })
}

// Helper function to log with timestamp
function logWithTimestamp(level, message, error = null) {
  const timestamp = new Date().toISOString()
  const logMessage = `[${timestamp}] [${level}] ${message}`
  
  // Always log to console (PM2 captures this)
  if (level === 'ERROR') {
    console.error(logMessage)
    if (error && error.stack) {
      console.error(error.stack)
    }
  } else {
    console.log(logMessage)
  }
  
  // Also write to a dedicated crash log for critical errors
  if (level === 'FATAL' || level === 'ERROR') {
    try {
      const crashLogPath = path.join(logsDir, 'crash.log')
      const logEntry = `${logMessage}\n${error ? error.stack + '\n' : ''}---\n`
      fs.appendFileSync(crashLogPath, logEntry)
    } catch (writeErr) {
      console.error('Failed to write to crash log:', writeErr)
    }
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logWithTimestamp('FATAL', `Uncaught Exception: ${err.message}`, err)
  // Give time to write logs before exit
  setTimeout(() => process.exit(1), 1000)
})

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logWithTimestamp('ERROR', `Unhandled Rejection: ${reason}`, reason instanceof Error ? reason : new Error(String(reason)))
})

// Handle process signals
process.on('SIGTERM', () => {
  logWithTimestamp('INFO', 'Received SIGTERM signal, shutting down gracefully...')
})

process.on('SIGINT', () => {
  logWithTimestamp('INFO', 'Received SIGINT signal, shutting down gracefully...')
})

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  logWithTimestamp('INFO', `Starting server on port ${port}...`)
  
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      logWithTimestamp('ERROR', `Error handling request ${req.method} ${req.url}`, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })
    .once('error', (err) => {
      logWithTimestamp('FATAL', `Server failed to start: ${err.message}`, err)
      process.exit(1)
    })
    .listen(port, () => {
      logWithTimestamp('INFO', `Winter League Cricket ready on http://${hostname}:${port}`)
    })
}).catch((err) => {
  logWithTimestamp('FATAL', `Failed to prepare Next.js app: ${err.message}`, err)
  process.exit(1)
})
