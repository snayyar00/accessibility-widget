import { Knex } from 'knex'

import database from '../../config/database.config'
import { INVITATION_STATUS_ACCEPTED, INVITATION_STATUS_PENDING } from '../../constants/invitation.constant'
import { ORGANIZATION_MANAGEMENT_ROLES } from '../../constants/organization.constant'
import { WORKSPACE_USER_STATUS_ACTIVE, WORKSPACE_USER_STATUS_DECLINE, WORKSPACE_USER_STATUS_INACTIVE, WORKSPACE_USER_STATUS_PENDING, WorkspaceUserRole } from '../../constants/workspace.constant'
import { stringToSlug } from '../../helpers/string.helper'
import { deleteOrganizationInvitations, deleteWorkspaceInvitations, GetDetailWorkspaceInvitation, getDetailWorkspaceInvitations, getOrganizationInvitation, getWorkspaceInvitation, updateWorkspaceInvitationByToken } from '../../repository/invitations.repository'
import { UserProfile } from '../../repository/user.repository'
import { createNewWorkspaceAndMember, deleteWorkspaceById, getAllWorkspace, GetAllWorkspaceResponse, getWorkspace, getWorkspaceMembers as getWorkspaceMembersRepo, updateWorkspace as updateWorkspaceRepo, Workspace } from '../../repository/workspace.repository'
import { setWorkspaceDomains } from '../../repository/workspace_allowed_sites.repository'
import { deleteWorkspaceUsers, getWorkspaceUser, updateWorkspaceUser } from '../../repository/workspace_users.repository'
import { canManageOrganization } from '../../utils/access.helper'
import { ApolloError, ValidationError } from '../../utils/graphql-errors.helper'
import logger from '../../utils/logger'
import { validateChangeWorkspaceMemberRole, validateCreateWorkspace, validateRemoveWorkspaceInvitation, validateRemoveWorkspaceMember, validateUpdateWorkspace } from '../../validations/workspace.validation'
import { getUserOrganization } from '../organization/organization_users.service'

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
 * Function to get all workspaces for current user
 *
 * @param UserProfile user User who execute this function
 * @returns Promise<GetAllWorkspaceResponse[]> Array of user's workspaces
 */
export async function getAllWorkspaces(user: UserProfile): Promise<GetAllWorkspaceResponse[]> {
  const allWorkspaces = await getAllWorkspace({ userId: user.id, organizationId: user.current_organization_id })

  const uniqueWorkspaces = allWorkspaces.reduce((acc: GetAllWorkspaceResponse[], current) => {
    const existingWorkspace = acc.find((ws) => ws.id === current.id)

    if (!existingWorkspace) {
      acc.push(current)
    }

    return acc
  }, [])

  return uniqueWorkspaces
}

/**
 * Function to get all workspaces for a specific organization
 * Only organization owner can see all workspaces
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

  if (!user.is_super_admin) {
    const userOrganization = await getUserOrganization(user.id, organizationId)

    if (!userOrganization) {
      return []
    }

    if (!canManageOrganization(userOrganization.role)) {
      return []
    }
  }

  const workspaces = await getAllWorkspace({ organizationId })

  const uniqueWorkspaces = workspaces.reduce((acc: Workspace[], current) => {
    const existingWorkspace = acc.find((ws) => ws.id === current.id)

    if (!existingWorkspace) acc.push(current)

    return acc
  }, [])

  return uniqueWorkspaces
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

  if (!user.current_organization_id) {
    return []
  }

  const userOrganization = await getUserOrganization(user.id, user.current_organization_id)

  if (!userOrganization) {
    return []
  }

  if (!canManageOrganization(userOrganization.role)) {
    return []
  }

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

  if (!user.current_organization_id) {
    return null
  }

  const userOrganization = await getUserOrganization(user.id, user.current_organization_id)

  if (!userOrganization) {
    return null
  }

  if (!canManageOrganization(userOrganization.role)) {
    return null
  }

  const workspace = await getWorkspace({ alias, organization_id: user.current_organization_id })

  return workspace || null
}

/**
 * Helper function to get existing member emails
 * @param GetAllWorkspaceResponse[] members Array of workspace members
 * @returns Set<string> Set of existing emails
 */
function getExistingMemberEmails(members: GetAllWorkspaceResponse[]): Set<string> {
  return new Set(members.map((member) => extractMemberEmail(member as WorkspaceMemberWithUser)).filter(Boolean) as string[])
}

/**
 * Helper function to validate workspace access permissions
 * @param UserProfile user User requesting access
 * @returns Promise<boolean> True if user has access
 */
async function validateWorkspaceAccess(user: UserProfile): Promise<boolean> {
  if (!user.current_organization_id) {
    return false
  }

  const userOrganization = await getUserOrganization(user.id, user.current_organization_id)

  return !!(userOrganization && canManageOrganization(userOrganization.role))
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

  const hasAccess = await validateWorkspaceAccess(user)

  if (!hasAccess) {
    return []
  }

  const workspace = await getWorkspace({ alias, organization_id: user.current_organization_id })
  if (!workspace) {
    return []
  }

  const members = await getWorkspaceMembersRepo({ workspaceId: workspace.id })
  const existingEmails = getExistingMemberEmails(members)

  const invitations = await getDetailWorkspaceInvitations({ workspaceId: workspace.id })
  const pendingInvitations = invitations.filter((invitation) => invitation.status === INVITATION_STATUS_PENDING)

  const invitedMembers = createVirtualUsersFromInvitations(pendingInvitations, existingEmails, workspace)

  return [...invitedMembers, ...members]
}

/**
 * Function to get all invitations of a workspace by alias
 * Only organization owner and admin can see all workspace invitations
 *
 * @param string alias Alias of the workspace to get invitations for
 * @param UserProfile user User requesting the workspace invitations
 * @returns Promise<GetDetailWorkspaceInvitation[]> Array of workspace invitations
 */
export async function getWorkspaceInvitationsByAlias(alias: string, user: UserProfile): Promise<GetDetailWorkspaceInvitation[]> {
  if (!alias) {
    throw new ValidationError('Workspace alias is required')
  }

  if (!user.current_organization_id) {
    return []
  }

  const userOrganization = await getUserOrganization(user.id, user.current_organization_id)

  if (!userOrganization) {
    return []
  }

  if (!canManageOrganization(userOrganization.role)) {
    return []
  }

  const workspace = await getWorkspace({ alias, organization_id: user.current_organization_id })

  if (!workspace) {
    return []
  }

  const invitations = await getDetailWorkspaceInvitations({ workspaceId: workspace.id })

  return invitations
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

  const orgUser = await getUserOrganization(user.id, Number(user.current_organization_id))
  const isAllowed = orgUser && canManageOrganization(orgUser.role)

  if (!isAllowed) {
    throw new ApolloError(`Only organization ${ORGANIZATION_MANAGEMENT_ROLES.join(', ')} can create the workspace`)
  }

  const alias = stringToSlug(workspaceName)

  const existingWorkspace = await getWorkspace({ alias })

  if (existingWorkspace) {
    logger.error('Workspace already exists, throwing error:', existingWorkspace)
    throw new ApolloError(`Workspace with alias "${alias}" already exists`)
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

  const orgUser = await getUserOrganization(user.id, Number(user.current_organization_id))
  const isAllowed = orgUser && canManageOrganization(orgUser.role)

  if (!isAllowed) {
    throw new ApolloError(`Only organization ${ORGANIZATION_MANAGEMENT_ROLES.join(', ')} can delete the workspace`)
  }

  const workspace = await getWorkspace({ id: workspace_id, organization_id: user.current_organization_id })

  if (!workspace) {
    throw new ApolloError('Workspace not found')
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
type UpdateWorkspaceData = Partial<Workspace> & {
  allowedSiteIds?: number[]
}

export async function updateWorkspace(user: UserProfile, workspace_id: number, data: UpdateWorkspaceData): Promise<Workspace> {
  const validateResult = validateUpdateWorkspace(data)

  if (Array.isArray(validateResult) && validateResult.length) {
    throw new ValidationError(validateResult.map((it) => it.message).join(','))
  }

  if (!user.current_organization_id) {
    throw new ApolloError('No current organization selected')
  }

  const orgUser = await getUserOrganization(user.id, Number(user.current_organization_id))
  const isAllowed = orgUser && canManageOrganization(orgUser.role)

  if (!isAllowed) {
    throw new ApolloError(`Only organization ${ORGANIZATION_MANAGEMENT_ROLES.join(', ')} can update the workspace`)
  }

  const workspace = await getWorkspace({ id: workspace_id, organization_id: user.current_organization_id })
  if (!workspace) {
    throw new ApolloError('Workspace not found')
  }

  const { id, organization_id, created_at, updated_at, allowedSiteIds, ...rawUpdateData } = data

  const cleanedData = Object.fromEntries(Object.entries(rawUpdateData).filter(([_, value]) => value !== undefined && value !== null))

  if (Object.keys(cleanedData).length === 0 && !allowedSiteIds) {
    throw new ValidationError('No data provided for update')
  }

  let finalUpdateData = { ...cleanedData }

  if (cleanedData.name) {
    const alias = stringToSlug(cleanedData.name as string)

    if (alias !== workspace.alias) {
      const existingWorkspace = await getWorkspace({ alias })

      if (existingWorkspace) {
        throw new ValidationError('Workspace with this name already exists')
      }
    }

    finalUpdateData = { ...finalUpdateData, alias }
  }

  if (Object.keys(finalUpdateData).length > 0) {
    await updateWorkspaceRepo(workspace_id, finalUpdateData)
  }

  if (allowedSiteIds !== undefined) {
    await setWorkspaceDomains(workspace_id, allowedSiteIds, user.id)
  }

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

  const orgUser = await getUserOrganization(user.id, Number(user.current_organization_id))
  const isAllowed = orgUser && canManageOrganization(orgUser.role)

  if (!isAllowed) {
    throw new ApolloError(`Only organization ${ORGANIZATION_MANAGEMENT_ROLES.join(', ')} can change workspace member roles`)
  }

  const workspaceMember = await getWorkspaceUser({ id })

  if (!workspaceMember) {
    throw new ApolloError('Workspace member not found')
  }

  const workspace = await getWorkspace({ id: workspaceMember.workspace_id, organization_id: user.current_organization_id })

  if (!workspace) {
    throw new ApolloError('Workspace not found or access denied')
  }

  if (workspaceMember.status === WORKSPACE_USER_STATUS_INACTIVE || workspaceMember.status === WORKSPACE_USER_STATUS_DECLINE) {
    throw new ApolloError(`Role cannot be changed for members with status ${WORKSPACE_USER_STATUS_DECLINE} or ${WORKSPACE_USER_STATUS_INACTIVE}`)
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

  const orgUser = await getUserOrganization(user.id, Number(user.current_organization_id))
  const isAllowed = orgUser && canManageOrganization(orgUser.role)

  if (!isAllowed) {
    throw new ApolloError(`Only organization ${ORGANIZATION_MANAGEMENT_ROLES.join(', ')} can remove workspace members`)
  }

  const workspaceMember = await getWorkspaceUser({ id })

  if (!workspaceMember) {
    throw new ApolloError('Workspace member not found')
  }

  const workspace = await getWorkspace({ id: workspaceMember.workspace_id, organization_id: user.current_organization_id })

  if (!workspace) {
    throw new ApolloError('Workspace not found')
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

/**
 * Function to remove workspace invitation
 * @param UserProfile user User who wants to remove invitation
 * @param number id ID of the invitation to remove
 * @returns Promise<boolean> True if invitation was removed successfully
 */
export async function removeWorkspaceInvitation(user: UserProfile, id: number): Promise<boolean> {
  const validateResult = validateRemoveWorkspaceInvitation({ id })

  if (Array.isArray(validateResult) && validateResult.length) {
    throw new ValidationError(validateResult.map((it) => it.message).join(','))
  }

  if (!user.current_organization_id) {
    throw new ApolloError('No current organization selected')
  }

  const orgUser = await getUserOrganization(user.id, Number(user.current_organization_id))
  const isAllowed = orgUser && canManageOrganization(orgUser.role)

  if (!isAllowed) {
    throw new ApolloError(`Only organization ${ORGANIZATION_MANAGEMENT_ROLES.join(', ')} can remove workspace invitations`)
  }

  const [invitation] = await getWorkspaceInvitation({ id })

  if (!invitation) {
    throw new ApolloError('Invitation not found')
  }

  const workspace = await getWorkspace({ id: invitation.workspace_id, organization_id: user.current_organization_id })

  if (!workspace) {
    throw new ApolloError('Workspace not found or access denied')
  }

  let transaction: Knex.Transaction

  try {
    transaction = await database.transaction()

    await deleteWorkspaceInvitations(
      {
        id,
      },
      transaction,
    )

    if (invitation.token && invitation.status !== INVITATION_STATUS_ACCEPTED) {
      await deleteWorkspaceUsers(
        {
          invitation_token: invitation.token,
        },
        transaction,
      )
    }

    await transaction.commit()

    logger.info('Successfully removed workspace invitation:', {
      workspace_id: workspace.id,
      invitation_id: id,
      removed_by: user.id,
    })

    return true
  } catch (error) {
    await transaction.rollback()

    logger.error('Failed to remove workspace invitation:', {
      error,
      workspace_id: workspace.id,
      invitation_id: id,
      remover_id: user.id,
    })

    throw new ApolloError(error)
  }
}

/**
 * Function to remove all workspace invitations for a user by email
 * @param UserProfile user User who wants to remove invitations
 * @param string email Email of the user whose invitations should be removed
 * @returns Promise<boolean> True if invitations were removed successfully
 */
export async function removeAllUserInvitations(user: UserProfile, email: string): Promise<boolean> {
  if (!user.current_organization_id) {
    throw new ApolloError('No current organization selected')
  }

  const orgUser = await getUserOrganization(user.id, Number(user.current_organization_id))
  const isAllowed = orgUser && canManageOrganization(orgUser.role)

  if (!isAllowed) {
    throw new ApolloError(`Only organization ${ORGANIZATION_MANAGEMENT_ROLES.join(', ')} can remove workspace invitations`)
  }

  let transaction: Knex.Transaction

  try {
    transaction = await database.transaction()

    // Get all workspace invitations for this email in this organization
    const workspaceInvitations = await getWorkspaceInvitation({
      email,
      organization_id: user.current_organization_id,
    })

    // Get all organization invitations for this email in this organization
    const organizationInvitations = await getOrganizationInvitation({
      email,
      organization_id: user.current_organization_id,
    })

    if (workspaceInvitations.length === 0 && organizationInvitations.length === 0) {
      await transaction.rollback()
      throw new ApolloError('No invitations found for this email')
    }

    // Remove all workspace invitations
    if (workspaceInvitations.length > 0) {
      await deleteWorkspaceInvitations(
        {
          email,
          organization_id: user.current_organization_id,
        },
        transaction,
      )

      // Remove associated workspace users for tokens that were not accepted
      for (const invitation of workspaceInvitations) {
        if (invitation.token && invitation.status !== INVITATION_STATUS_ACCEPTED) {
          await deleteWorkspaceUsers(
            {
              invitation_token: invitation.token,
            },
            transaction,
          )
        }
      }
    }

    // Remove all organization invitations
    if (organizationInvitations.length > 0) {
      await deleteOrganizationInvitations(
        {
          email,
          organization_id: user.current_organization_id,
        },
        transaction,
      )
    }

    await transaction.commit()

    logger.info('Successfully removed all invitations for user:', {
      email,
      organization_id: user.current_organization_id,
      removed_by: user.id,
      workspace_invitations_count: workspaceInvitations.length,
      organization_invitations_count: organizationInvitations.length,
    })

    return true
  } catch (error) {
    await transaction.rollback()

    logger.error('Failed to remove all workspace invitations:', {
      error,
      email,
      organization_id: user.current_organization_id,
      remover_id: user.id,
    })

    throw new ApolloError(error)
  }
}

/**
 * Helper function to extract email from workspace member record
 * @param WorkspaceMemberWithUser member Member record with user field
 * @returns string | undefined Email of the member
 */
function extractMemberEmail(member: WorkspaceMemberWithUser): string | undefined {
  return member.user?.email || member.email
}

/**
 * Helper function to create virtual users from workspace invitations
 * @param GetDetailWorkspaceInvitation[] invitations Array of workspace invitations
 * @param Set<string> existingEmails Set of existing member emails to filter out
 * @param Workspace workspace Workspace object for context
 * @returns GetAllWorkspaceResponse[] Array of virtual users
 */
function createVirtualUsersFromInvitations(invitations: GetDetailWorkspaceInvitation[], existingEmails: Set<string>, workspace: Workspace): (GetAllWorkspaceResponse & WorkspaceMemberWithUser)[] {
  return invitations
    .filter((invitation) => !existingEmails.has(invitation.email))
    .map((invitation, idx) => {
      const virtualUserId = -(idx + 1000)

      return {
        id: virtualUserId,
        user_id: virtualUserId,
        workspace_id: workspace.id,
        role: invitation.role,
        status: WORKSPACE_USER_STATUS_PENDING,
        created_at: invitation.created_at || new Date().toISOString(),
        updated_at: null as string | null,
        deleted_at: null as string | null,
        invitation_token: invitation.token,
        email: invitation.email,
        name: invitation.email.split('@')[0],
        isActive: false,
        organization_id: workspace.organization_id,
        alias: workspace.alias,
        invitationId: invitation.id,
        user: {
          id: virtualUserId,
          email: invitation.email,
          name: invitation.email.split('@')[0],
          current_organization_id: null as number | null,
          isActive: false,
        },
      }
    })
}
