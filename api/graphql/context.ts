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

  let organization = user?.currentOrganization || null

  if (!organization) {
    const allowedFrontendUrlFromRequest = getMatchingFrontendUrl(domainFromRequest)
    const organizationByDomain = await getOrganizationByDomainService(allowedFrontendUrlFromRequest)

    organization = organizationByDomain instanceof ValidationError ? null : organizationByDomain
  }

  const allowedFrontendUrl = organization?.domain ? getMatchingFrontendUrl(organization.domain) : getMatchingFrontendUrl(domainFromRequest)

  return {
    req,
    res,
    user,
    organization,

    domainFromRequest,
    allowedFrontendUrl,
  }
}
