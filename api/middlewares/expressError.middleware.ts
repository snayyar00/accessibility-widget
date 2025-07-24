import { NextFunction, Request, Response } from 'express'

import { IS_DEV, IS_LOCAL, IS_PROD } from '../config/server.config'
import { extractClientDomain } from '../utils/domain.utils'
import { getOperationName } from '../utils/logger.utils'

interface ErrorWithStatus extends Error {
  status?: number
  statusCode?: number
  code?: string
}

export const expressErrorMiddleware = (error: ErrorWithStatus, req: Request, res: Response, _next: NextFunction) => {
  // Calculate response time if not available
  const responseTime = Date.now() - (req as Request & { startTime?: number }).startTime || 0

  const statusCode = error.status || error.statusCode || 500
  const contentLength = 0 // Error responses typically have minimal content

  const errorLog = JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'error',
    type: 'express',
    method: req.method,
    url: req.url,
    status: statusCode,
    response_time_ms: responseTime,
    content_length: contentLength,
    operation_name: getOperationName(req.body),
    domain: extractClientDomain(req),
    error: {
      message: error.message || 'Unknown error',
      code: error.code || 'INTERNAL_ERROR',
      stack: IS_LOCAL || IS_DEV ? error.stack : undefined,
    },
  })

  console.error(errorLog)

  // Send error response if not already sent
  if (!res.headersSent) {
    res.status(statusCode).json({
      error: IS_PROD ? 'Internal server error' : error.message,
    })
  }
}
