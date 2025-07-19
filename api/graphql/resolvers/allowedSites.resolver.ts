import { combineResolvers } from 'graphql-resolvers'

import { addSite, changeURL, deleteSite, findUserSites, isDomainAlreadyAdded } from '../../services/allowedSites/allowedSites.service'
import { isAuthenticated } from './authorization.resolver'

const resolvers = {
  Query: {
    getUserSites: combineResolvers(isAuthenticated, (_, t, { user }) => findUserSites(user.id)),

    isDomainAlreadyAdded: combineResolvers((_, { url }) => isDomainAlreadyAdded(url)),
  },
  Mutation: {
    addSite: combineResolvers(isAuthenticated, (_, { url }, { user }) => addSite(user.id, url)),

    changeURL: combineResolvers(isAuthenticated, (_, { newURL, siteId }, { user }) => changeURL(siteId, user.id, newURL)),

    deleteSite: combineResolvers(isAuthenticated, (_, { url }, { user }) => deleteSite(user.id, url)),
  },
}

export default resolvers
