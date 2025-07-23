import { combineResolvers } from 'graphql-resolvers'

import { getSiteVisitorsByURL } from '../../services/uniqueVisitors/uniqueVisitor.service'
import { allowedOrganization, isAuthenticated } from './authorization.resolver'

const resolvers = {
  Query: {
    getSiteVisitorsByURL: combineResolvers(allowedOrganization, isAuthenticated, (_, { url }, { user }) => getSiteVisitorsByURL(url, user)),
  },
}

export default resolvers
