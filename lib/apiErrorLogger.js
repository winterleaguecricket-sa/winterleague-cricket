// API route error-logging wrapper
// Wraps any Next.js API handler to catch + log errors with full context

import { logApiError } from './logger';

/**
 * Wrap an API route handler with automatic error logging
 * Usage:
 *   import { withErrorLogging } from '../../lib/apiErrorLogger';
 *   export default withErrorLogging(async function handler(req, res) { ... });
 */
export function withErrorLogging(handler) {
  return async function wrappedHandler(req, res) {
    const start = Date.now();
    
    // Monkey-patch res.json and res.status to capture outgoing status
    const origStatus = res.status.bind(res);
    let capturedStatus = 200;
    res.status = (code) => {
      capturedStatus = code;
      return origStatus(code);
    };

    try {
      await handler(req, res);
      
      // Log 4xx/5xx responses as warnings/errors
      const finalStatus = res.statusCode || capturedStatus;
      if (finalStatus >= 500) {
        logApiError({
          method: req.method,
          url: req.url,
          statusCode: finalStatus,
          error: `API returned ${finalStatus}`,
          body: req.method !== 'GET' ? req.body : undefined,
          query: req.query,
          duration: Date.now() - start,
          userAgent: req.headers?.['user-agent']
        });
      }
    } catch (error) {
      const duration = Date.now() - start;
      
      logApiError({
        method: req.method,
        url: req.url,
        statusCode: 500,
        error,
        body: req.method !== 'GET' ? req.body : undefined,
        query: req.query,
        duration,
        userAgent: req.headers?.['user-agent']
      });

      // Send error response if headers haven't been sent yet
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Internal server error',
          message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message
        });
      }
    }
  };
}
