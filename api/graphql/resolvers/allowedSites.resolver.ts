import { combineResolvers } from 'graphql-resolvers'

import { addSite, changeURL, deleteSite, findUserSites, isDomainAlreadyAdded } from '../../services/allowedSites/allowedSites.service'
import { allowedOrganization, isAuthenticated } from './authorization.resolver'

const resolvers = {
  Query: {
    getUserSites: combineResolvers(allowedOrganization, isAuthenticated, (_, t, { user }) => findUserSites(user)),

    getAllUserSites: combineResolvers(allowedOrganization, isAuthenticated, (_, t, { user }) => findUserSites(user, true)),

    isDomainAlreadyAdded: combineResolvers(allowedOrganization, (_, { url }) => isDomainAlreadyAdded(url)),
  },
  Mutation: {
    addSite: combineResolvers(allowedOrganization, isAuthenticated, (_, { url }, { user }) => addSite(user.id, url)),

    changeURL: combineResolvers(allowedOrganization, isAuthenticated, (_, { newURL, siteId }, { user }) => changeURL(siteId, user.id, newURL)),

    deleteSite: combineResolvers(allowedOrganization, isAuthenticated, (_, { url }, { user }) => deleteSite(user.id, url)),
  },
}

export default resolvers
