import { combineResolvers } from 'graphql-resolvers'

import { analyzeDomain } from '../../services/domainAnalysis/domainAnalysis.service'
import { allowedOrganization, isAuthenticated } from './authorization.resolver'

const resolvers = {
  Query: {
    analyzeDomain: combineResolvers(isAuthenticated, allowedOrganization, async (_, { domain }, { user }) => {
      const result = await analyzeDomain(domain)
      return result
    }),
  },
}

export default resolvers
