import getUserLogined from '../services/authentication/get-user-logined.service'
import { extractClientDomain } from '../utils/domain.utils'
import { ContextParams, GraphQLContext } from './types'

/**
 * Creates GraphQL context for each request
 * Extracts authentication token and resolves user information
 */
export async function createGraphQLContext({ req, res }: ContextParams): Promise<GraphQLContext> {
  const authHeader = req.headers.authorization || ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  const user = await getUserLogined(bearerToken)
  const clientDomain = extractClientDomain(req)

  return {
    req,
    res,
    user,
    clientDomain,
  }
}
