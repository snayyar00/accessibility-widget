import { Request } from 'express'
import { GraphQLError } from 'graphql/error'

import { extractClientDomain } from '../utils/domain.utils'

/**
 * Determines log level and type based on error type
 */
function getLogLevelAndType(hasAuthError: boolean, hasIntrospectionError: boolean, hasForbiddenError: boolean, hasInternalError: boolean, hasBadUserInputError: boolean) {
  if (hasAuthError) {
    return { level: 'warn', type: 'security' }
  }

  if (hasForbiddenError) {
    return { level: 'warn', type: 'security' }
  }

  if (hasIntrospectionError) {
    return { level: 'warn', type: 'graphql' }
  }

  if (hasBadUserInputError) {
    return { level: 'error', type: 'security' }
  }

  if (hasInternalError) {
    return { level: 'error', type: 'graphql' }
  }

  return { level: 'error', type: 'graphql' }
}

/**
 * Logs GraphQL errors with the same logic as graphqlError.middleware.ts
 */
export function logGraphQLErrors(errors: readonly GraphQLError[], req: Request, operationName?: string) {
  const hasAuthError = errors.some((err) => err.extensions?.code === 'UNAUTHENTICATED' || err.message?.includes('Authentication fail'))
  const hasForbiddenError = errors.some((err) => err.extensions?.code === 'FORBIDDEN')
  const hasIntrospectionError = errors.some((err) => err.extensions?.code === 'GRAPHQL_VALIDATION_FAILED' && err.message?.includes('introspection is not allowed'))
  const hasInternalError = errors.some((err) => err.extensions?.code === 'INTERNAL_SERVER_ERROR')
  const hasBadUserInputError = errors.some((err) => err.extensions?.code === 'BAD_USER_INPUT')

  const { level, type } = getLogLevelAndType(hasAuthError, hasIntrospectionError, hasForbiddenError, hasInternalError, hasBadUserInputError)

  const errorLog = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    type,
    method: req.method,
    url: req.originalUrl || req.url,
    operation_name: operationName || '-',
    domain: extractClientDomain(req),
    errors: errors.map((err) => ({
      message: err.message,
      code: err.extensions?.code || 'UNKNOWN',
      path: err.path?.join('.') || '-',
    })),
  })

  switch (level) {
    case 'warn':
      console.warn(errorLog)
      break
    case 'error':
      console.error(errorLog)
      break
    default:
      console.log(errorLog)
  }
}
