import getUserLogined from '../services/authentication/get-user-logined.service'
import { getOrganizationByDomainService } from '../services/organization/organization.service'
import { getDomainFromRequest } from '../utils/domain.utils'
import { getMatchingFrontendUrl } from '../utils/env.utils'
import { ValidationError } from '../utils/graphql-errors.helper'
import { ContextParams, GraphQLContext } from './types'

/**
 * Creates GraphQL context for each request
 * Extracts authentication token and resolves user information
 */
export async function createGraphQLContext({ req, res }: ContextParams): Promise<GraphQLContext> {
  const authHeader = req.headers.authorization || ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  const user = await getUserLogined(bearerToken)

  const domainFromRequest = getDomainFromRequest(req)
  const allowedFrontendUrl = getMatchingFrontendUrl(domainFromRequest)

  let organization = user?.currentOrganization || null

  if (!organization) {
    const orgFromDomain = await getOrganizationByDomainService(allowedFrontendUrl)
    organization = orgFromDomain instanceof ValidationError ? null : orgFromDomain
  }

  console.log('user', user)

  return {
    req,
    res,
    user,
    domainFromRequest,
    allowedFrontendUrl,
    organization,
  }
}
