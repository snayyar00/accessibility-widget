import getUserLogined from '../services/authentication/get-user-logined.service'
import { getOrganizationByDomainService } from '../services/organization/organization.service'
import { extractClientDomain } from '../utils/domain.utils'
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
  const clientDomain = extractClientDomain(req)

  const allowedFrontendUrl = getMatchingFrontendUrl(clientDomain)
  const organization = await getOrganizationByDomainService(allowedFrontendUrl)

  return {
    req,
    res,
    user,
    clientDomain,
    allowedFrontendUrl,
    organization: organization instanceof ValidationError ? null : organization,
  }
}
