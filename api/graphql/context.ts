import getUserLogined from '../services/authentication/get-user-logined.service'
import { ContextParams, GraphQLContext } from './types'

/**
 * Creates GraphQL context for each request
 * Extracts authentication token and resolves user information
 */
export async function createGraphQLContext({ req, res }: ContextParams): Promise<GraphQLContext> {
  const { cookies } = req
  const bearerToken = cookies.token || null
  const user = await getUserLogined(bearerToken, res)

  return {
    req,
    res,
    user,
  }
}
