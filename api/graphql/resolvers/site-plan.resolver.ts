import { combineResolvers } from 'graphql-resolvers'

import { getPlanBySiteIdAndUserId, updateSitesPlan } from '../../services/allowedSites/plans-sites.service'
import { allowedOrganization, isAuthenticated } from './authorization.resolver'

const resolvers = {
  Query: {
    getPlanBySiteIdAndUserId: combineResolvers(allowedOrganization, isAuthenticated, async (_, { siteId }, { user }) => {
      const result = await getPlanBySiteIdAndUserId(user.id, siteId, user.current_organization_id)
      console.log('Resolver result:', result)
      return result
    }),
  },
  Mutation: {
    updateSitesPlan: combineResolvers(allowedOrganization, isAuthenticated, (_, { sitesPlanId, planName, billingType }, { user }) => updateSitesPlan(user.id, sitesPlanId, planName, billingType, false, user.current_organization_id)),
  },
}

export default resolvers
