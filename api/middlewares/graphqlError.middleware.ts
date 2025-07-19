import { NextFunction, Request, Response } from 'express'

import accessLogStream from '../libs/logger/stream'

/**
 * Middleware for logging GraphQL errors
 * Intercepts response and analyzes GraphQL errors in JSON response
 */
export const graphqlErrorMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now()
  const originalUrl = req.originalUrl || req.url
  const originalSend = res.send

  // Intercept res.send to analyze GraphQL errors
  res.send = function (body) {
    try {
      const parsed = JSON.parse(body)

      // Check for GraphQL errors presence
      if (parsed.errors && Array.isArray(parsed.errors) && parsed.errors.length > 0) {
        logGraphQLErrors(parsed.errors, req, res, startTime, originalUrl, body)
      }
    } catch {
      // Ignore JSON parsing errors
    }

    return originalSend.call(this, body)
  }

  next()
}

/**
 * Logs GraphQL errors with appropriate level and type
 */
function logGraphQLErrors(errors: any[], req: Request, res: Response, startTime: number, originalUrl: string, body: string) {
  const responseTime = Date.now() - startTime
  const contentLength = Buffer.byteLength(body, 'utf8')

  // Determine error type
  const hasAuthError = errors.some((err: any) => err.extensions?.code === 'UNAUTHENTICATED' || err.message?.includes('Authentication fail'))

  const hasIntrospectionError = errors.some((err: any) => err.extensions?.code === 'GRAPHQL_VALIDATION_FAILED' && err.message?.includes('introspection is not allowed'))

  // Determine log level and type
  const { level, type } = getLogLevelAndType(hasAuthError, hasIntrospectionError)

  // Build log entry
  const errorLog = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    type,
    method: req.method,
    url: originalUrl,
    status: res.statusCode,
    response_time_ms: responseTime,
    content_length: contentLength,
    operation_name: req.body?.operationName || '-',
    errors: errors.map((err: any) => ({
      message: err.message,
      code: err.extensions?.code || 'UNKNOWN',
      path: err.path?.join('.') || '-',
    })),
  })

  // Write to log
  writeLogToStream(errorLog)
}

/**
 * Determines log level and type based on error type
 */
function getLogLevelAndType(hasAuthError: boolean, hasIntrospectionError: boolean) {
  if (hasAuthError) {
    return { level: 'warn', type: 'security' }
  }

  if (hasIntrospectionError) {
    return { level: 'warn', type: 'graphql' }
  }

  return { level: 'error', type: 'graphql' }
}

/**
 * Writes log data to stream or console
 */
function writeLogToStream(logData: string) {
  if (accessLogStream) {
    accessLogStream.write(`${logData}\n`)
  } else {
    // console.log(logData);
  }
}
