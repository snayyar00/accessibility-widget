import { Request } from 'express'
import { GraphQLError } from 'graphql/error'

import accessLogStream from '../libs/logger/stream'

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
    console.log(logData)
  }
}

/**
 * Logs GraphQL errors with the same logic as graphqlError.middleware.ts
 */
export function logGraphQLErrors(errors: readonly GraphQLError[], req: Request, operationName?: string) {
  const hasAuthError = errors.some((err) => err.extensions?.code === 'UNAUTHENTICATED' || err.message?.includes('Authentication fail'))
  const hasIntrospectionError = errors.some((err) => err.extensions?.code === 'GRAPHQL_VALIDATION_FAILED' && err.message?.includes('introspection is not allowed'))

  const { level, type } = getLogLevelAndType(hasAuthError, hasIntrospectionError)

  const errorLog = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    type,
    method: req.method,
    url: req.originalUrl || req.url,
    operation_name: operationName || '-',
    errors: errors.map((err) => ({
      message: err.message,
      code: err.extensions?.code || 'UNKNOWN',
      path: err.path?.join('.') || '-',
    })),
  })

  writeLogToStream(errorLog)
}
