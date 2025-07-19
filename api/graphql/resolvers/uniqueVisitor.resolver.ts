import { combineResolvers } from 'graphql-resolvers'

import { getSiteVisitorsByURL } from '../../services/uniqueVisitors/uniqueVisitor.service'
import { isAuthenticated } from './authorization.resolver'

const resolvers = {
  Query: {
    getSiteVisitorsByURL: combineResolvers(isAuthenticated, (_, { url }, { user }) => getSiteVisitorsByURL(url, user)),
  },
}

export default resolvers
