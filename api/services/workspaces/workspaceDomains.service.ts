import { findSitesByIds } from '../../repository/sites_allowed.repository'
import { getWorkspace, Workspace } from '../../repository/workspace.repository'
import { addWorkspaceDomainsRepo, getWorkspaceDomains, removeWorkspaceDomainsRepo, WorkspaceWithDomains } from '../../repository/workspace_allowed_sites.repository'
import { getWorkspaceUser } from '../../repository/workspace_users.repository'
import { canManageOrganization, canManageWorkspace } from '../../utils/access.helper'
import { ApolloError, ValidationError } from '../../utils/graphql-errors.helper'
import { UserLogined } from '../authentication/get-user-logined.service'

/**
 * Get all domains for a workspace
 * @param workspaceId - ID of workspace
 * @param UserLogined - User requesting the domains
 * @returns Promise<WorkspaceWithDomains[]> - Array of domains for the workspace
 */
export async function getWorkspaceDomainsService(workspaceId: number, user: UserLogined): Promise<WorkspaceWithDomains[]> {
  if (!user.current_organization_id) {
    throw new ApolloError('No current organization selected')
  }

  const workspace = await getWorkspace({ id: workspaceId, organization_id: user.current_organization_id })

  if (!workspace) {
    return []
  }

  const isOrgManager = user.is_super_admin || (user.currentOrganizationUser && canManageOrganization(user.currentOrganizationUser.role))

  const workspaceMember = await getWorkspaceUser({ user_id: user.id, workspace_id: workspaceId })
  const isWorkspaceManager = workspaceMember && canManageWorkspace(workspaceMember.role)
  const isWorkspaceMember = !!workspaceMember

  if (!isOrgManager && !isWorkspaceManager && !isWorkspaceMember) {
    return []
  }

  return await getWorkspaceDomains(workspaceId)
}

/**
 * Add domains to workspace
 * @param UserLogined - User who wants to add domains
 * @param workspace_id - ID of the workspace
 * @param siteIds - Array of site IDs to add
 * @returns Promise<Workspace> Updated workspace
 */
export async function addWorkspaceDomains(user: UserLogined, workspace_id: number, siteIds: number[]): Promise<Workspace> {
  if (!user.current_organization_id) {
    throw new ApolloError('No current organization selected')
  }

  if (!siteIds || siteIds.length === 0) {
    throw new ValidationError('At least one site ID is required')
  }

  // Remove duplicates from siteIds
  const uniqueSiteIds = [...new Set(siteIds)]

  const workspace = await getWorkspace({ id: workspace_id, organization_id: user.current_organization_id })

  if (!workspace) {
    throw new ApolloError('Workspace not found')
  }

  const isOrgManager = user.is_super_admin || (user.currentOrganizationUser && canManageOrganization(user.currentOrganizationUser.role))

  const workspaceMember = await getWorkspaceUser({ user_id: user.id, workspace_id })
  const isWorkspaceManager = workspaceMember && canManageWorkspace(workspaceMember.role)
  const isWorkspaceMember = !!workspaceMember

  if (!isOrgManager && !isWorkspaceManager && !isWorkspaceMember) {
    throw new ApolloError('You must be a member of this workspace to add domains')
  }

  const sites = await findSitesByIds(uniqueSiteIds)

  const invalidSites = sites.filter((site) => site.organization_id !== user.current_organization_id)

  if (invalidSites.length > 0) {
    throw new ValidationError(`Sites with IDs [${invalidSites.map((s) => s.id).join(', ')}] do not belong to current organization`)
  }

  if (sites.length !== uniqueSiteIds.length) {
    const foundIds = sites.map((s) => s.id)
    const notFoundIds = uniqueSiteIds.filter((id) => !foundIds.includes(id))
    throw new ValidationError(`Sites with IDs [${notFoundIds.join(', ')}] were not found`)
  }

  if (!isOrgManager && !isWorkspaceManager) {
    const notOwnedSites = sites.filter((site) => site.user_id !== user.id)

    if (notOwnedSites.length > 0) {
      throw new ValidationError(`You can only add domains you own. Sites with IDs [${notOwnedSites.map((s) => s.id).join(', ')}] are not owned by you`)
    }
  }

  await addWorkspaceDomainsRepo(workspace_id, uniqueSiteIds, user.id)

  const updated = await getWorkspace({ id: workspace_id, organization_id: user.current_organization_id })

  if (!updated) {
    throw new ApolloError('Workspace not found after update')
  }

  return updated
}

/**
 * Remove domains from workspace
 * @param UserLogined - User who wants to remove domains
 * @param workspace_id - ID of the workspace
 * @param siteIds - Array of site IDs to remove
 * @returns Promise<Workspace> Updated workspace
 */
export async function removeWorkspaceDomains(user: UserLogined, workspace_id: number, siteIds: number[]): Promise<Workspace> {
  if (!user.current_organization_id) {
    throw new ApolloError('No current organization selected')
  }

  if (!siteIds || siteIds.length === 0) {
    throw new ValidationError('At least one site ID is required')
  }

  const uniqueSiteIds = [...new Set(siteIds)]

  const workspace = await getWorkspace({ id: workspace_id, organization_id: user.current_organization_id })
  if (!workspace) {
    throw new ApolloError('Workspace not found')
  }

  const isOrgManager = user.is_super_admin || (user.currentOrganizationUser && canManageOrganization(user.currentOrganizationUser.role))

  const workspaceMember = await getWorkspaceUser({ user_id: user.id, workspace_id })
  const isWorkspaceManager = workspaceMember && canManageWorkspace(workspaceMember.role)
  const isWorkspaceMember = !!workspaceMember

  if (!isOrgManager && !isWorkspaceManager && !isWorkspaceMember) {
    throw new ApolloError('You must be a member of this workspace to remove domains')
  }

  const sites = await findSitesByIds(uniqueSiteIds)

  if (sites.length !== uniqueSiteIds.length) {
    const foundIds = sites.map((s) => s.id)
    const notFoundIds = uniqueSiteIds.filter((id) => !foundIds.includes(id))
    throw new ValidationError(`Sites with IDs [${notFoundIds.join(', ')}] were not found`)
  }

  const invalidSites = sites.filter((site) => site.organization_id !== user.current_organization_id)
  if (invalidSites.length > 0) {
    throw new ValidationError(`Sites with IDs [${invalidSites.map((s) => s.id).join(', ')}] do not belong to current organization`)
  }

  if (!isOrgManager && !isWorkspaceManager) {
    const notOwnedSites = sites.filter((site) => site.user_id !== user.id)

    if (notOwnedSites.length > 0) {
      throw new ValidationError(`You can only remove domains you own. Sites with IDs [${notOwnedSites.map((s) => s.id).join(', ')}] are not owned by you`)
    }
  }

  await removeWorkspaceDomainsRepo(workspace_id, uniqueSiteIds)

  const updated = await getWorkspace({ id: workspace_id, organization_id: user.current_organization_id })

  if (!updated) {
    throw new ApolloError('Workspace not found after update')
  }

  return updated
}
