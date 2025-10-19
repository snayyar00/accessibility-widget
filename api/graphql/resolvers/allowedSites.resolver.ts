import { combineResolvers } from 'graphql-resolvers'

import { toggleSiteMonitoring } from '../../repository/sites_allowed.repository'
import { addSite, changeURL, deleteSite, findUserSites, isDomainAlreadyAdded } from '../../services/allowedSites/allowedSites.service'
import { allowedOrganization, isAuthenticated } from './authorization.resolver'

const resolvers = {
  Query: {
    getUserSites: combineResolvers(allowedOrganization, isAuthenticated, (_, t, { user }) => findUserSites(user)),

    isDomainAlreadyAdded: combineResolvers(allowedOrganization, (_, { url }) => isDomainAlreadyAdded(url)),
  },
  Mutation: {
    addSite: combineResolvers(allowedOrganization, isAuthenticated, (_, { url }, { user }) => addSite(user, url)),

    changeURL: combineResolvers(allowedOrganization, isAuthenticated, (_, { newURL, siteId }, { user }) => changeURL(siteId, user.id, newURL, user.current_organization_id)),

    deleteSite: combineResolvers(allowedOrganization, isAuthenticated, (_, { url }, { user }) => deleteSite(user.id, url, user.current_organization_id)),

    toggleSiteMonitoring: combineResolvers(allowedOrganization, isAuthenticated, async (_, { siteId, enabled }, { user }) => {
      return toggleSiteMonitoring(siteId, enabled, user.id, user.current_organization_id)
    }),
  },
}

export default resolvers
