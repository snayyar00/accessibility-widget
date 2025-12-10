import { combineResolvers } from 'graphql-resolvers'

import { addSite, changeURL, deleteSite, findAvailableSitesForWorkspaceAssignment, findUserSites, isDomainAlreadyAdded, toggleSiteMonitoring } from '../../services/allowedSites/allowedSites.service'
import { allowedOrganization, isAuthenticated } from './authorization.resolver'

const resolvers = {
  Query: {
    getUserSites: combineResolvers(allowedOrganization, isAuthenticated, (_, { limit, offset, filter, search }, { user }) => {
      // If limit is not provided (undefined), fetch all (for backward compatibility)
      // If limit is 0 or negative, also fetch all
      // Otherwise use provided limit for pagination
      const paginationLimit = limit !== undefined && limit !== null && limit > 0 ? limit : undefined
      // Only pass offset if limit is also defined (MySQL requires LIMIT when using OFFSET)
      const paginationOffset = paginationLimit !== undefined && offset !== undefined && offset !== null && offset >= 0 ? offset : undefined
      const filterValue = filter === 'active' || filter === 'disabled' ? filter : 'all'
      const searchTerm = search && typeof search === 'string' && search.trim().length > 0 ? search.trim() : undefined
      return findUserSites(user, paginationLimit, paginationOffset, filterValue, searchTerm)
    }),

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
