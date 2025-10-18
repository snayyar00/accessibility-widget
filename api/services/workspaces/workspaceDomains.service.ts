import { UserProfile } from '../../repository/user.repository'
import { getWorkspace } from '../../repository/workspace.repository'
import { getWorkspaceDomains, WorkspaceWithDomains } from '../../repository/workspace_allowed_sites.repository'
import { getWorkspaceUser } from '../../repository/workspace_users.repository'
import { canManageOrganization, canManageWorkspace } from '../../utils/access.helper'
import { ApolloError } from '../../utils/graphql-errors.helper'
import { getUserOrganization } from '../organization/organization_users.service'

/**
 * Get all domains for a workspace
 * @param workspaceId - ID of workspace
 * @param user - User requesting the domains
 * @returns Promise<WorkspaceWithDomains[]> - Array of domains for the workspace
 */
export async function getWorkspaceDomainsService(workspaceId: number, user: UserProfile): Promise<WorkspaceWithDomains[]> {
  if (!user.current_organization_id) {
    throw new ApolloError('No current organization selected')
  }

  // Check if workspace exists and belongs to user's organization
  const workspace = await getWorkspace({ id: workspaceId, organization_id: user.current_organization_id })

  if (!workspace) {
    return []
  }

  // Check permissions: super admin OR org admin/owner OR workspace admin/owner OR workspace member
  const orgUser = await getUserOrganization(user.id, Number(user.current_organization_id))
  const isOrgManager = user.is_super_admin || (orgUser && canManageOrganization(orgUser.role))

  const workspaceMember = await getWorkspaceUser({ user_id: user.id, workspace_id: workspaceId })
  const isWorkspaceManager = workspaceMember && canManageWorkspace(workspaceMember.role)
  const isWorkspaceMember = !!workspaceMember

  if (!isOrgManager && !isWorkspaceManager && !isWorkspaceMember) {
    return []
  }

  return await getWorkspaceDomains(workspaceId)
}
