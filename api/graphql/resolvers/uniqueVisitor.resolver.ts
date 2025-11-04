import { combineResolvers } from 'graphql-resolvers'

import { getSiteVisitorsByURL } from '../../services/uniqueVisitors/uniqueVisitor.service'
import { allowedOrganization, isAuthenticated } from './authorization.resolver'

const resolvers = {
  Query: {
    getSiteVisitorsByURL: combineResolvers(allowedOrganization, isAuthenticated, (_, { url, startDate, endDate }, { user }) => {
      // Convert string dates to Date objects if provided
      const start = startDate ? new Date(startDate) : undefined
      const end = endDate ? new Date(endDate) : undefined
      return getSiteVisitorsByURL(url, user, start, end)
    }),
  },
}

export default resolvers
