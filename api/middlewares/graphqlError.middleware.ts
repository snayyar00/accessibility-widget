import { NextFunction, Request, Response } from 'express'
import { GraphQLError } from 'graphql'

import accessLogStream from '../libs/logger/stream'

/**
 * Middleware for logging GraphQL errors
 */
export const graphqlErrorMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!req.path.includes('/graphql')) {
    return next()
  }

  const startTime = Date.now()
  const originalUrl = req.originalUrl || req.url
  const originalSend = res.send.bind(res)

  res.send = function (body: string | Buffer | object) {
    try {
      const parsed = typeof body === 'string' ? JSON.parse(body) : body

      if (parsed?.errors && Array.isArray(parsed.errors) && parsed.errors.length > 0) {
        logGraphQLErrors(parsed.errors, req, res, startTime, originalUrl, body)
      }
    } catch {
      // Ignore JSON parsing errors - could be non-JSON response
    }

    return originalSend(body)
  }

  next()
}

/**
 * Logs GraphQL errors with appropriate level and type
 */
function logGraphQLErrors(errors: GraphQLError[], req: Request, res: Response, startTime: number, originalUrl: string, body: string | object) {
  const responseTime = Date.now() - startTime
  const contentLength = Buffer.byteLength(typeof body === 'string' ? body : JSON.stringify(body), 'utf8')

  const hasAuthError = errors.some((err) => err.extensions?.code === 'UNAUTHENTICATED' || err.message?.includes('Authentication fail'))
  const hasIntrospectionError = errors.some((err) => err.extensions?.code === 'GRAPHQL_VALIDATION_FAILED' && err.message?.includes('introspection is not allowed'))

  const { level, type } = getLogLevelAndType(hasAuthError, hasIntrospectionError)

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
    errors: errors.map((err) => ({
      message: err.message,
      code: err.extensions?.code || 'UNKNOWN',
      path: err.path?.join('.') || '-',
    })),
  })

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
