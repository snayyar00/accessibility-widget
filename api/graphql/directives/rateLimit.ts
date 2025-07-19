import { GraphQLResolveInfo } from 'graphql'
import { rateLimitDirective } from 'graphql-rate-limit-directive'

const { rateLimitDirectiveTransformer } = rateLimitDirective({
  keyGenerator: (directiveArgs, source, args, context: any, info: GraphQLResolveInfo): string => {
    let operationKey = 'unknown'

    // Get operation key (type and field name) from GraphQLResolveInfo
    if (info && info.parentType && info.fieldName) {
      operationKey = `${info.parentType.name}.${info.fieldName}`
    }

    // Priority 1: Use authenticated user ID for rate limit isolation
    if (context.user?.id) {
      const key = `user:${context.user.id}:${operationKey}`

      return key
    }

    // Priority 2: Use IP address if user ID is not available
    const ip = context.req?.headers['cf-connecting-ip'] || context.req?.headers['x-forwarded-for']?.split(',')[0]?.trim() || context.req?.ip || context.req?.connection?.remoteAddress || context.req?.socket?.remoteAddress

    if (ip && ip !== 'unknown' && ip !== '::1' && ip !== '127.0.0.1') {
      const key = `ip:${ip}:${operationKey}`
      return key
    }

    // Priority 3: Use fingerprint based on request headers for fallback uniqueness
    const { req } = context
    const userAgent = req?.headers?.['user-agent']?.slice(0, 50) || ''
    const acceptLanguage = req?.headers?.['accept-language']?.slice(0, 30) || ''
    const acceptEncoding = req?.headers?.['accept-encoding']?.slice(0, 30) || ''
    const fingerprint = Buffer.from(`${userAgent}-${acceptLanguage}-${acceptEncoding}`).toString('base64').slice(0, 20)
    const key = `fingerprint:${fingerprint}:${operationKey}`

    return key
  },

  onLimit: (_, directiveArgs: any): Error => {
    const customMessage = directiveArgs.message || 'Too many requests, please try again later.'

    return new Error(customMessage)
  },
})

const rateLimitDirectiveTypeDefs = `
    directive @rateLimit(
        """
        Number of occurrences allowed over duration.
        """
        limit: Int! = 60

        """
        Number of seconds before limit is reset.
        """
        duration: Int! = 60

        """
        Custom error message when limit is exceeded.
        """
        message: String
    ) on OBJECT | FIELD_DEFINITION
`

export { rateLimitDirectiveTransformer, rateLimitDirectiveTypeDefs }
