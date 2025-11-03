import { combineResolvers } from 'graphql-resolvers'

import { addSite, changeURL, deleteSite, findAvailableSitesForWorkspaceAssignment, findUserSites, isDomainAlreadyAdded, toggleSiteMonitoring } from '../../services/allowedSites/allowedSites.service'
import { allowedOrganization, isAuthenticated } from './authorization.resolver'

const resolvers = {
  Query: {
    getUserSites: combineResolvers(allowedOrganization, isAuthenticated, (_, t, { user }) => findUserSites(user)),

    getAvailableSitesForWorkspace: combineResolvers(allowedOrganization, isAuthenticated, (_, t, { user }) => findAvailableSitesForWorkspaceAssignment(user)),

    isDomainAlreadyAdded: combineResolvers(allowedOrganization, (_, { url }) => isDomainAlreadyAdded(url)),
  },
  Mutation: {
    addSite: combineResolvers(allowedOrganization, isAuthenticated, (_, { url }, { user }) => addSite(user, url)),

    changeURL: combineResolvers(allowedOrganization, isAuthenticated, (_, { newURL, siteId }, { user }) => changeURL(siteId, user.id, newURL, user.current_organization_id, user.is_super_admin)),

    deleteSite: combineResolvers(allowedOrganization, isAuthenticated, (_, { url }, { user }) => deleteSite(user.id, url, user.current_organization_id)),

    toggleSiteMonitoring: combineResolvers(allowedOrganization, isAuthenticated, async (_, { siteId, enabled }, { user }) => {
      return toggleSiteMonitoring(siteId, enabled, user.id, user.current_organization_id, user.is_super_admin)
    }),
  },
}

export default resolvers
