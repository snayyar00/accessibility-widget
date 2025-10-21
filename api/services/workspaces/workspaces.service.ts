import { Knex } from 'knex'

import database from '../../config/database.config'
import { TABLES } from '../../constants/database.constant'
import { INVITATION_STATUS_PENDING } from '../../constants/invitation.constant'
import { ORGANIZATION_MANAGEMENT_ROLES } from '../../constants/organization.constant'
import { WORKSPACE_MANAGEMENT_ROLES, WORKSPACE_USER_ROLE_OWNER, WORKSPACE_USER_STATUS_ACTIVE, WORKSPACE_USER_STATUS_DECLINE, WORKSPACE_USER_STATUS_INACTIVE, WORKSPACE_USER_STATUS_PENDING, WorkspaceUserRole } from '../../constants/workspace.constant'
import { stringToSlug } from '../../helpers/string.helper'
import { deleteWorkspaceInvitations, getDetailWorkspaceInvitations, updateWorkspaceInvitationByToken } from '../../repository/invitations.repository'
import { UserProfile } from '../../repository/user.repository'
import { createNewWorkspaceAndMember, deleteWorkspaceById, getAllWorkspace, GetAllWorkspaceResponse, getWorkspace, getWorkspaceMembers as getWorkspaceMembersRepo, updateWorkspace as updateWorkspaceRepo, Workspace } from '../../repository/workspace.repository'
import { addWorkspaceDomainsRepo, removeWorkspaceDomainsRepo } from '../../repository/workspace_allowed_sites.repository'
import { deleteWorkspaceUsers, getWorkspaceUser, updateWorkspaceUser } from '../../repository/workspace_users.repository'
import { canManageOrganization, canManageWorkspace } from '../../utils/access.helper'
import { ApolloError, ValidationError } from '../../utils/graphql-errors.helper'
import logger from '../../utils/logger'
import { validateChangeWorkspaceMemberRole, validateCreateWorkspace, validateRemoveWorkspaceMember, validateUpdateWorkspace } from '../../validations/workspace.validation'
import { getUserOrganization } from '../organization/organization_users.service'
import { createVirtualUsersFromInvitations } from './workspaceInvitations.service'

type CreateWorkspaceResponse = {
  id: Promise<number | Error>
  name: string
  alias: string
  organization_id: number
}

type WorkspaceMemberWithUser = GetAllWorkspaceResponse & {
  user?: {
    id?: number
    name?: string
    email?: string
    avatarUrl?: string
  }
  email?: string
}

/**
 * Helper function to remove duplicate workspaces by ID
 * @param workspaces Array of workspaces that may contain duplicates
 * @returns Array of unique workspaces
 */
function removeDuplicateWorkspaces<T extends { id?: number }>(workspaces: T[]): T[] {
  return workspaces.reduce((acc: T[], current) => {
    const existingWorkspace = acc.find((ws) => ws.id === current.id)

    if (!existingWorkspace) {
      acc.push(current)
    }

    return acc
  }, [])
}

/**
 * Function to get all workspaces for current user
 * Users with organization management rights see all organization workspaces
 * Regular users see only workspaces they are members of
 *
 * @param UserProfile user User who execute this function
 * @returns Promise<GetAllWorkspaceResponse[]> Array of user's workspaces
 */
export async function getAllWorkspaces(user: UserProfile): Promise<GetAllWorkspaceResponse[]> {
  if (!user.current_organization_id) {
    return []
  }

  const userOrganization = await getUserOrganization(user.id, user.current_organization_id)

  // If user has management rights or is super admin, show all organization workspaces
  if (user.is_super_admin || (userOrganization && canManageOrganization(userOrganization.role))) {
    const allWorkspaces = await getAllWorkspace({ organizationId: user.current_organization_id })
    return removeDuplicateWorkspaces(allWorkspaces)
  }

  // Regular users see only their workspaces
  const userWorkspaces = await getAllWorkspace({ userId: user.id, organizationId: user.current_organization_id })
  return removeDuplicateWorkspaces(userWorkspaces)
}

/**
 * Function to get all workspaces for a specific organization
 * Users with management rights see all workspaces, regular users see only their workspaces
 *
 * @param number organizationId Organization ID to get workspaces for
 * @param UserProfile user User requesting the workspaces
 * @returns Promise<Workspace[]> Array of workspaces belonging to the organization
 */
export async function getOrganizationWorkspaces(organizationId: number, user: UserProfile): Promise<Workspace[]> {
  if (!organizationId) {
    throw new ValidationError('Organization ID is required')
  }

  if (!user) {
    throw new ValidationError('User is required')
  }

  // Super admin can see all workspaces
  if (user.is_super_admin) {
    const workspaces = await getAllWorkspace({ organizationId })
    return removeDuplicateWorkspaces(workspaces)
  }

  const userOrganization = await getUserOrganization(user.id, organizationId)

  if (!userOrganization) {
    return []
  }

  // Users with management rights see all organization workspaces
  if (canManageOrganization(userOrganization.role)) {
    const workspaces = await getAllWorkspace({ organizationId })
    return removeDuplicateWorkspaces(workspaces)
  }

  // Regular users see only their workspaces
  const workspaces = await getAllWorkspace({ userId: user.id, organizationId })
  return removeDuplicateWorkspaces(workspaces)
}

/**
 * Function to get all members of a workspace
 * Only organization owner and admin can see all workspace members
 *
 * @param number workspaceId ID of the workspace to get members for
 * @param UserProfile user User requesting the workspace members
 * @returns Promise<GetAllWorkspaceResponse[]> Array of workspace members
 */
export async function getWorkspaceMembers(workspaceId: number, user?: UserProfile): Promise<GetAllWorkspaceResponse[]> {
  if (!workspaceId) {
    throw new ValidationError('Workspace ID is required')
  }

  if (!user || !user.id) {
    return []
  }

  if (!user.current_organization_id) {
    return []
  }

  // First, check if workspace belongs to user's current organization
  const workspace = await getWorkspace({ id: workspaceId, organization_id: user.current_organization_id })
  if (!workspace) {
    return []
  }

  // Check if user is a member of this workspace
  const userWorkspaceMembership = await getWorkspaceUser({ user_id: user.id, workspace_id: workspaceId })

  if (userWorkspaceMembership) {
    // User is a member - show members
    const members = await getWorkspaceMembersRepo({ workspaceId })
    return members
  }

  // Not a member - check if has org management rights
  const userOrganization = await getUserOrganization(user.id, Number(user.current_organization_id))

  if (!user.is_super_admin && (!userOrganization || !canManageOrganization(userOrganization.role))) {
    return []
  }

  // Has org management rights or is super admin
  const members = await getWorkspaceMembersRepo({ workspaceId })
  return members
}

/**
 * Function to get workspace by alias
 * Only organization members with management rights can access workspaces within their organization
 *
 * @param string alias Alias of the workspace to get
 * @param UserProfile user User requesting the workspace
 * @returns Promise<Workspace | null> Workspace or null if not found/no access
 */
export async function getWorkspaceByAlias(alias: string, user: UserProfile): Promise<Workspace | null> {
  if (!alias) {
    throw new ValidationError('Workspace alias is required')
  }

  if (!user || !user.id) {
    return null
  }

  if (!user.current_organization_id) {
    return null
  }

  // Get workspace and ensure it belongs to user's current organization
  const workspace = await getWorkspace({ alias, organization_id: user.current_organization_id })

  if (!workspace) {
    return null
  }

  // Check if user is a member of this workspace
  const userWorkspaceMembership = await getWorkspaceUser({ user_id: user.id, workspace_id: workspace.id })

  if (userWorkspaceMembership) {
    return workspace
  }

  // Not a member - check if has org management rights or is super admin
  const userOrganization = await getUserOrganization(user.id, Number(user.current_organization_id))

  if (!user.is_super_admin && (!userOrganization || !canManageOrganization(userOrganization.role))) {
    return null
  }

  return workspace
}

/**
 * Helper function to get existing member emails
 * @param GetAllWorkspaceResponse[] members Array of workspace members
 * @returns Set<string> Set of existing emails
 */
function getExistingMemberEmails(members: GetAllWorkspaceResponse[]): Set<string> {
  return new Set(members.map((member) => (member as WorkspaceMemberWithUser).user?.email || (member as WorkspaceMemberWithUser).email).filter(Boolean) as string[])
}

/**
 * Function to get all members of a workspace by alias
 * Only organization owner and admin can see all workspace members
 *
 * @param string alias Alias of the workspace to get members for
 * @param UserProfile user User requesting the workspace members
 * @returns Promise<GetAllWorkspaceResponse[]> Array of workspace members
 */
export async function getWorkspaceMembersByAlias(alias: string, user: UserProfile): Promise<GetAllWorkspaceResponse[]> {
  if (!alias) {
    throw new ValidationError('Workspace alias is required')
  }

  if (!user || !user.id) {
    return []
  }

  if (!user.current_organization_id) {
    return []
  }

  // Get workspace and ensure it belongs to user's current organization
  const workspace = await getWorkspace({ alias, organization_id: user.current_organization_id })
  if (!workspace) {
    return []
  }

  // Check if user is a member of this workspace
  const userWorkspaceMembership = await getWorkspaceUser({ user_id: user.id, workspace_id: workspace.id })

  if (userWorkspaceMembership) {
    // User is a member - show members and invitations
    const members = await getWorkspaceMembersRepo({ workspaceId: workspace.id })
    const existingEmails = getExistingMemberEmails(members)

    const invitations = await getDetailWorkspaceInvitations({ workspaceId: workspace.id })
    const pendingInvitations = invitations.filter((invitation) => invitation.status === INVITATION_STATUS_PENDING)

    const invitedMembers = createVirtualUsersFromInvitations(pendingInvitations, existingEmails, workspace)

    return [...invitedMembers, ...members]
  }

  // Not a member - check if has org management rights or is super admin
  const userOrganization = await getUserOrganization(user.id, Number(user.current_organization_id))

  if (!user.is_super_admin && (!userOrganization || !canManageOrganization(userOrganization.role))) {
    return []
  }

  // Has org management rights or is super admin
  const members = await getWorkspaceMembersRepo({ workspaceId: workspace.id })
  const existingEmails = getExistingMemberEmails(members)

  const invitations = await getDetailWorkspaceInvitations({ workspaceId: workspace.id })
  const pendingInvitations = invitations.filter((invitation) => invitation.status === INVITATION_STATUS_PENDING)

  const invitedMembers = createVirtualUsersFromInvitations(pendingInvitations, existingEmails, workspace)

  return [...invitedMembers, ...members]
}

/**
 * Function to create workspace
 *
 * @param UserProfile user User who creates workspace
 * @param string workspaceName Name of new workspace
 * @returns Promise<CreateWorkspaceResponse> Created workspace info
 */
export async function createWorkspace(user: UserProfile, workspaceName: string): Promise<CreateWorkspaceResponse> {
  const validateResult = validateCreateWorkspace({ name: workspaceName })

  if (Array.isArray(validateResult) && validateResult.length) {
    throw new ValidationError(validateResult.map((it) => it.message).join(','))
  }

  if (!user.current_organization_id) {
    throw new ApolloError('No current organization selected')
  }

  // Check if user is member of organization
  const orgUser = await getUserOrganization(user.id, Number(user.current_organization_id))

  if (!orgUser) {
    throw new ApolloError('You are not a member of this organization')
  }

  const alias = stringToSlug(workspaceName)

  // Check if workspace with this alias already exists in current organization
  const existingWorkspace = await getWorkspace({ alias, organization_id: user.current_organization_id })

  if (existingWorkspace) {
    logger.error('Workspace already exists in this organization, throwing error:', existingWorkspace)
    throw new ApolloError(`Workspace with alias "${alias}" already exists in this organization`)
  }

  const workspaceId = createNewWorkspaceAndMember({ name: workspaceName, alias, organization_id: user.current_organization_id, user_id: user.id })

  return {
    id: workspaceId,
    organization_id: user.current_organization_id,
    name: workspaceName,
    alias,
  }
}

/**
 * Function to delete workspace
 * @param UserProfile user User who wants to delete workspace
 * @param number workspace_id ID of the workspace to delete
 * @returns Promise<boolean> True if workspace was deleted successfully
 */
export async function deleteWorkspace(user: UserProfile, workspace_id: number): Promise<boolean> {
  if (!user.current_organization_id) {
    throw new ApolloError('No current organization selected')
  }

  const workspace = await getWorkspace({ id: workspace_id, organization_id: user.current_organization_id })

  if (!workspace) {
    throw new ApolloError('Workspace not found')
  }

  // Check permissions: super admin OR org admin/owner OR workspace admin/owner
  const orgUser = await getUserOrganization(user.id, Number(user.current_organization_id))
  const isOrgManager = user.is_super_admin || (orgUser && canManageOrganization(orgUser.role))

  const workspaceMember = await getWorkspaceUser({ user_id: user.id, workspace_id })
  const isWorkspaceManager = workspaceMember && canManageWorkspace(workspaceMember.role)

  if (!isOrgManager && !isWorkspaceManager) {
    throw new ApolloError(`Only organization ${ORGANIZATION_MANAGEMENT_ROLES.join(', ')} or workspace ${WORKSPACE_MANAGEMENT_ROLES.join(', ')} can delete the workspace`)
  }

  await deleteWorkspaceById(workspace_id)

  return true
}

/**
 * Function to update workspace
 * @param UserProfile user User who wants to update workspace
 * @param number workspace_id ID of the workspace to update
 * @param Partial<Workspace> data Object with fields to update
 * @returns Promise<Workspace> Updated workspace
 */
export async function updateWorkspace(user: UserProfile, workspace_id: number, data: Partial<Workspace>): Promise<Workspace> {
  const validateResult = validateUpdateWorkspace(data)

  if (Array.isArray(validateResult) && validateResult.length) {
    throw new ValidationError(validateResult.map((it) => it.message).join(','))
  }

  if (!user.current_organization_id) {
    throw new ApolloError('No current organization selected')
  }

  const workspace = await getWorkspace({ id: workspace_id, organization_id: user.current_organization_id })
  if (!workspace) {
    throw new ApolloError('Workspace not found')
  }

  // Check permissions: super admin OR org admin/owner OR workspace admin/owner
  const orgUser = await getUserOrganization(user.id, Number(user.current_organization_id))
  const isOrgManager = user.is_super_admin || (orgUser && canManageOrganization(orgUser.role))

  const workspaceMember = await getWorkspaceUser({ user_id: user.id, workspace_id })
  const isWorkspaceManager = workspaceMember && canManageWorkspace(workspaceMember.role)

  if (!isOrgManager && !isWorkspaceManager) {
    throw new ApolloError(`Only organization ${ORGANIZATION_MANAGEMENT_ROLES.join(', ')} or workspace ${WORKSPACE_MANAGEMENT_ROLES.join(', ')} can update the workspace`)
  }

  const { id, organization_id, created_at, updated_at, ...rawUpdateData } = data

  const cleanedData = Object.fromEntries(Object.entries(rawUpdateData).filter(([_, value]) => value !== undefined && value !== null))

  if (Object.keys(cleanedData).length === 0) {
    throw new ValidationError('No data provided for update')
  }

  let finalUpdateData = { ...cleanedData }

  if (cleanedData.name) {
    const alias = stringToSlug(cleanedData.name as string)

    if (alias !== workspace.alias) {
      // Check if workspace with this alias already exists in current organization
      const existingWorkspace = await getWorkspace({ alias, organization_id: user.current_organization_id })

      if (existingWorkspace) {
        throw new ValidationError('Workspace with this name already exists in this organization')
      }
    }

    finalUpdateData = { ...finalUpdateData, alias }
  }

  await updateWorkspaceRepo(workspace_id, finalUpdateData)

  const updated = await getWorkspace({ id: workspace_id, organization_id: user.current_organization_id })

  if (!updated) {
    throw new ApolloError('Workspace not found after update')
  }

  return updated
}

/**
 * Function to add domains to workspace
 * @param UserProfile user User who wants to add domains
 * @param number workspace_id ID of the workspace
 * @param number[] siteIds Array of site IDs to add
 * @returns Promise<Workspace> Updated workspace
 */
export async function addWorkspaceDomains(user: UserProfile, workspace_id: number, siteIds: number[]): Promise<Workspace> {
  if (!user.current_organization_id) {
    throw new ApolloError('No current organization selected')
  }

  if (!siteIds || siteIds.length === 0) {
    throw new ValidationError('At least one site ID is required')
  }

  const workspace = await getWorkspace({ id: workspace_id, organization_id: user.current_organization_id })
  if (!workspace) {
    throw new ApolloError('Workspace not found')
  }

  // Check permissions: super admin OR org admin/owner OR workspace admin/owner
  const orgUser = await getUserOrganization(user.id, Number(user.current_organization_id))
  const isOrgManager = user.is_super_admin || (orgUser && canManageOrganization(orgUser.role))

  const workspaceMember = await getWorkspaceUser({ user_id: user.id, workspace_id })
  const isWorkspaceManager = workspaceMember && canManageWorkspace(workspaceMember.role)

  if (!isOrgManager && !isWorkspaceManager) {
    throw new ApolloError(`Only organization ${ORGANIZATION_MANAGEMENT_ROLES.join(', ')} or workspace ${WORKSPACE_MANAGEMENT_ROLES.join(', ')} can manage workspace domains`)
  }

  // Verify that all sites belong to the current organization
  const sites = await database(TABLES.allowed_sites).whereIn('id', siteIds).select('id', 'organization_id', 'user_id')

  const invalidSites = sites.filter((site) => site.organization_id !== user.current_organization_id)

  if (invalidSites.length > 0) {
    throw new ValidationError(`Sites with IDs [${invalidSites.map((s) => s.id).join(', ')}] do not belong to current organization`)
  }

  if (sites.length !== siteIds.length) {
    throw new ValidationError('Some sites were not found')
  }

  // For regular members (not org/workspace managers), verify they can only add their own sites
  if (!isOrgManager && !isWorkspaceManager) {
    const notOwnedSites = sites.filter((site) => site.user_id !== user.id)
    if (notOwnedSites.length > 0) {
      throw new ValidationError(`You can only add your own sites. Sites with IDs [${notOwnedSites.map((s) => s.id).join(', ')}] are not owned by you`)
    }
  }

  // Add new domains (function will check for duplicates)
  await addWorkspaceDomainsRepo(workspace_id, siteIds, user.id)

  const updated = await getWorkspace({ id: workspace_id, organization_id: user.current_organization_id })

  if (!updated) {
    throw new ApolloError('Workspace not found after update')
  }

  return updated
}

/**
 * Function to remove domains from workspace
 * @param UserProfile user User who wants to remove domains
 * @param number workspace_id ID of the workspace
 * @param number[] siteIds Array of site IDs to remove
 * @returns Promise<Workspace> Updated workspace
 */
export async function removeWorkspaceDomains(user: UserProfile, workspace_id: number, siteIds: number[]): Promise<Workspace> {
  if (!user.current_organization_id) {
    throw new ApolloError('No current organization selected')
  }

  if (!siteIds || siteIds.length === 0) {
    throw new ValidationError('At least one site ID is required')
  }

  const workspace = await getWorkspace({ id: workspace_id, organization_id: user.current_organization_id })
  if (!workspace) {
    throw new ApolloError('Workspace not found')
  }

  // Check permissions: super admin OR org admin/owner OR workspace admin/owner
  const orgUser = await getUserOrganization(user.id, Number(user.current_organization_id))
  const isOrgManager = user.is_super_admin || (orgUser && canManageOrganization(orgUser.role))

  const workspaceMember = await getWorkspaceUser({ user_id: user.id, workspace_id })
  const isWorkspaceManager = workspaceMember && canManageWorkspace(workspaceMember.role)

  if (!isOrgManager && !isWorkspaceManager) {
    throw new ApolloError(`Only organization ${ORGANIZATION_MANAGEMENT_ROLES.join(', ')} or workspace ${WORKSPACE_MANAGEMENT_ROLES.join(', ')} can manage workspace domains`)
  }

  // Remove specified domains
  await removeWorkspaceDomainsRepo(workspace_id, siteIds)

  const updated = await getWorkspace({ id: workspace_id, organization_id: user.current_organization_id })

  if (!updated) {
    throw new ApolloError('Workspace not found after update')
  }

  return updated
}

/**
 * Function to change workspace member role
 * @param UserProfile user User who wants to change member role
 * @param number id ID of the workspace user record
 * @param WorkspaceUserRole role New role for the user
 * @returns Promise<boolean> True if role was changed successfully
 */
export async function changeWorkspaceMemberRole(user: UserProfile, id: number, role: WorkspaceUserRole): Promise<boolean> {
  const validateResult = validateChangeWorkspaceMemberRole({ id, role })

  if (Array.isArray(validateResult) && validateResult.length) {
    throw new ValidationError(validateResult.map((it) => it.message).join(','))
  }

  if (!user.current_organization_id) {
    throw new ApolloError('No current organization selected')
  }

  const workspaceMember = await getWorkspaceUser({ id })

  if (!workspaceMember) {
    throw new ApolloError('Workspace member not found')
  }

  const workspace = await getWorkspace({ id: workspaceMember.workspace_id, organization_id: user.current_organization_id })

  if (!workspace) {
    throw new ApolloError('Workspace not found or access denied')
  }

  // Check if user is trying to change their own role (only super admin or org admin/owner can do this)
  if (user.id === workspaceMember.user_id) {
    const orgUser = await getUserOrganization(user.id, Number(user.current_organization_id))
    const isOrgManager = user.is_super_admin || (orgUser && canManageOrganization(orgUser.role))

    if (!isOrgManager) {
      throw new ApolloError('You cannot change your own role')
    }
  }

  // Check if trying to assign owner role - only super admin or org admin/owner can do this
  if (role === WORKSPACE_USER_ROLE_OWNER) {
    const orgUser = await getUserOrganization(user.id, Number(user.current_organization_id))
    const isOrgManager = user.is_super_admin || (orgUser && canManageOrganization(orgUser.role))

    if (!isOrgManager) {
      throw new ApolloError(`Only organization ${ORGANIZATION_MANAGEMENT_ROLES.join(', ')} can assign ${WORKSPACE_USER_ROLE_OWNER} role`)
    }
  }

  // Check permissions: super admin OR org admin/owner OR workspace admin/owner
  const orgUser = await getUserOrganization(user.id, Number(user.current_organization_id))
  const isOrgManager = user.is_super_admin || (orgUser && canManageOrganization(orgUser.role))

  const currentUserWorkspaceMember = await getWorkspaceUser({ user_id: user.id, workspace_id: workspace.id })
  const isWorkspaceManager = currentUserWorkspaceMember && canManageWorkspace(currentUserWorkspaceMember.role)

  if (!isOrgManager && !isWorkspaceManager) {
    throw new ApolloError(`Only organization ${ORGANIZATION_MANAGEMENT_ROLES.join(', ')} or workspace ${WORKSPACE_MANAGEMENT_ROLES.join(', ')} can change member roles`)
  }

  // Check if target member is currently owner and initiator is not org admin/owner
  if (workspaceMember.role === WORKSPACE_USER_ROLE_OWNER && !isOrgManager) {
    throw new ApolloError(`Only organization ${ORGANIZATION_MANAGEMENT_ROLES.join(', ')} can change ${WORKSPACE_USER_ROLE_OWNER} role`)
  }

  if (workspaceMember.status === WORKSPACE_USER_STATUS_INACTIVE || workspaceMember.status === WORKSPACE_USER_STATUS_DECLINE) {
    throw new ApolloError(`Role cannot be changed for members with status ${WORKSPACE_USER_STATUS_DECLINE} or ${WORKSPACE_USER_STATUS_INACTIVE}`)
  }

  // Check for pending owner invitations or existing owner when changing to/from owner role
  if (role === WORKSPACE_USER_ROLE_OWNER || workspaceMember.role === WORKSPACE_USER_ROLE_OWNER) {
    // Skip check if not actually changing the role
    if (workspaceMember.role !== role) {
      const allInvitations = await getDetailWorkspaceInvitations({ workspaceId: workspace.id })
      const pendingOwnerInvitation = allInvitations.find((inv) => inv.role === WORKSPACE_USER_ROLE_OWNER && inv.status === INVITATION_STATUS_PENDING)

      if (pendingOwnerInvitation) {
        if (workspaceMember.role === WORKSPACE_USER_ROLE_OWNER && role !== WORKSPACE_USER_ROLE_OWNER) {
          throw new ApolloError(`Cannot change ${WORKSPACE_USER_ROLE_OWNER} role while there is a pending invitation for ${WORKSPACE_USER_ROLE_OWNER} role. Please cancel the invitation first.`)
        }
        if (role === WORKSPACE_USER_ROLE_OWNER && workspaceMember.role !== WORKSPACE_USER_ROLE_OWNER) {
          throw new ApolloError(`There is already a pending invitation for ${WORKSPACE_USER_ROLE_OWNER} role. Please cancel it before assigning a new ${WORKSPACE_USER_ROLE_OWNER}.`)
        }
      }
    }
  }

  // Check if trying to assign owner role - only one owner allowed per workspace
  if (role === WORKSPACE_USER_ROLE_OWNER) {
    const allWorkspaceMembers = await getWorkspaceMembersRepo({ workspaceId: workspace.id })
    const existingOwner = allWorkspaceMembers.find((member) => member.role === WORKSPACE_USER_ROLE_OWNER && member.user_id !== workspaceMember.user_id)

    if (existingOwner) {
      throw new ApolloError(`Workspace can have only one ${WORKSPACE_USER_ROLE_OWNER}. Please change the current ${WORKSPACE_USER_ROLE_OWNER} role first.`)
    }
  }

  let transaction: Knex.Transaction

  try {
    transaction = await database.transaction()

    await updateWorkspaceUser({ user_id: workspaceMember.user_id, workspace_id: workspace.id }, { role }, transaction)

    if (workspaceMember.status === WORKSPACE_USER_STATUS_PENDING && workspaceMember.invitation_token) {
      const [workspaceInvitation] = await getDetailWorkspaceInvitations({ token: workspaceMember.invitation_token })

      if (workspaceInvitation) {
        await updateWorkspaceInvitationByToken(workspaceMember.invitation_token, { workspace_role: role, status: WORKSPACE_USER_STATUS_PENDING }, transaction)
      }
    }

    await transaction.commit()

    logger.info(`User ${user.id} changed role of user ${workspaceMember.user_id} to ${role} in workspace ${workspace.id}`)

    return true
  } catch (error) {
    await transaction.rollback()

    logger.error('Failed to change workspace member role:', {
      error,
      workspace_id: workspace.id,
      user_id: workspaceMember.user_id,
      new_role: role,
      changer_id: user.id,
    })

    throw new ApolloError(error)
  }
}

/**
 * Function to remove workspace member
 * @param UserProfile user User who wants to remove member
 * @param string alias Alias of the workspace
 * @param string userId ID of the user to remove (will be converted to number)
 * @returns Promise<boolean> True if member was removed successfully
 */
export async function removeWorkspaceMember(user: UserProfile, id: number): Promise<boolean> {
  const validateResult = validateRemoveWorkspaceMember({ id })

  if (Array.isArray(validateResult) && validateResult.length) {
    throw new ValidationError(validateResult.map((it) => it.message).join(','))
  }

  if (!user.current_organization_id) {
    throw new ApolloError('No current organization selected')
  }

  const workspaceMember = await getWorkspaceUser({ id })

  if (!workspaceMember) {
    throw new ApolloError('Workspace member not found')
  }

  const workspace = await getWorkspace({ id: workspaceMember.workspace_id, organization_id: user.current_organization_id })

  if (!workspace) {
    throw new ApolloError('Workspace not found')
  }

  // Check permissions: super admin OR org admin/owner OR workspace admin/owner
  const orgUser = await getUserOrganization(user.id, Number(user.current_organization_id))
  const isOrgManager = user.is_super_admin || (orgUser && canManageOrganization(orgUser.role))

  const currentUserWorkspaceMember = await getWorkspaceUser({ user_id: user.id, workspace_id: workspace.id })
  const isWorkspaceManager = currentUserWorkspaceMember && canManageWorkspace(currentUserWorkspaceMember.role)

  if (!isOrgManager && !isWorkspaceManager) {
    throw new ApolloError(`Only organization ${ORGANIZATION_MANAGEMENT_ROLES.join(', ')} or workspace ${WORKSPACE_MANAGEMENT_ROLES.join(', ')} can remove members`)
  }

  const allMembers = await getWorkspaceMembersRepo({ workspaceId: workspace.id })
  const activeMembers = allMembers.filter((member) => member.status === WORKSPACE_USER_STATUS_ACTIVE)

  if (activeMembers.length === 1 && workspaceMember.status === WORKSPACE_USER_STATUS_ACTIVE) {
    throw new ApolloError('Cannot remove the last active member from workspace')
  }

  let transaction: Knex.Transaction

  try {
    transaction = await database.transaction()

    await deleteWorkspaceUsers(
      {
        user_id: workspaceMember.user_id,
        workspace_id: workspace.id,
      },
      transaction,
    )

    if (workspaceMember.invitation_token) {
      await deleteWorkspaceInvitations(
        {
          token: workspaceMember.invitation_token,
        },
        transaction,
      )
    }

    await transaction.commit()

    logger.info('Successfully removed workspace member:', {
      workspace_id: workspace.id,
      removed_user_id: workspaceMember.user_id,
      removed_by: user.id,
    })

    return true
  } catch (error) {
    await transaction.rollback()

    logger.error('Failed to remove workspace member:', {
      error,
      workspace_id: workspace.id,
      user_id: workspaceMember.user_id,
      remover_id: user.id,
    })

    throw new ApolloError(error)
  }
}
