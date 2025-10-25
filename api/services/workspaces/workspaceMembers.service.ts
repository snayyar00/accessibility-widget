import { Knex } from 'knex'

import database from '../../config/database.config'
import { INVITATION_STATUS_PENDING } from '../../constants/invitation.constant'
import { ORGANIZATION_MANAGEMENT_ROLES } from '../../constants/organization.constant'
import { WORKSPACE_MANAGEMENT_ROLES, WORKSPACE_USER_ROLE_OWNER, WORKSPACE_USER_STATUS_ACTIVE, WORKSPACE_USER_STATUS_DECLINE, WORKSPACE_USER_STATUS_INACTIVE, WORKSPACE_USER_STATUS_PENDING, WorkspaceUserRole } from '../../constants/workspace.constant'
import { deletePendingInvitationsByCreator, deleteWorkspaceInvitations, getDetailWorkspaceInvitations, getInvitationTokensByCreator, getWorkspaceInvitation, updateWorkspaceInvitationByToken } from '../../repository/invitations.repository'
import { GetAllWorkspaceResponse, getWorkspace, getWorkspaceMembers as getWorkspaceMembersRepo } from '../../repository/workspace.repository'
import { removeWorkspaceDomainsBySiteOwner } from '../../repository/workspace_allowed_sites.repository'
import { deletePendingWorkspaceMembersByTokens, deleteWorkspaceUsers, getWorkspaceUser, updateWorkspaceUser } from '../../repository/workspace_users.repository'
import { canManageOrganization, canManageWorkspace, isWorkspaceMember } from '../../utils/access.helper'
import { ApolloError, ForbiddenError, ValidationError } from '../../utils/graphql-errors.helper'
import logger from '../../utils/logger'
import { validateChangeWorkspaceMemberRole, validateRemoveWorkspaceMember } from '../../validations/workspace.validation'
import { UserLogined } from '../authentication/get-user-logined.service'
import { createVirtualUsersFromInvitations } from './workspaceInvitations.service'

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
 * Function to get all members of a workspace by ID
 * Users who are members of the workspace can see members
 * Super admins and organization managers can also see members
 *
 * @param number workspaceId ID of the workspace to get members for
 * @param UserLogined user User requesting the workspace members
 * @returns Promise<GetAllWorkspaceResponse[]> Array of workspace members
 */
export async function getWorkspaceMembers(workspaceId: number, user?: UserLogined): Promise<GetAllWorkspaceResponse[]> {
  if (!workspaceId) {
    throw new ValidationError('Workspace ID is required')
  }

  if (!user || !user.id) {
    return []
  }

  if (!user.current_organization_id) {
    return []
  }

  const workspace = await getWorkspace({ id: workspaceId, organization_id: user.current_organization_id })
  if (!workspace) {
    return []
  }

  const userWorkspaceMembership = await getWorkspaceUser({ user_id: user.id, workspace_id: workspaceId })

  if (userWorkspaceMembership) {
    const members = await getWorkspaceMembersRepo({ workspaceId })

    return members
  }

  if (!user.is_super_admin && (!user.currentOrganizationUser || !canManageOrganization(user.currentOrganizationUser.role))) {
    return []
  }

  const members = await getWorkspaceMembersRepo({ workspaceId })
  return members
}

/**
 * Function to get all members of a workspace by alias
 * Only organization owner and admin can see all workspace members
 *
 * @param string alias Alias of the workspace to get members for
 * @param UserLogined user User requesting the workspace members
 * @returns Promise<GetAllWorkspaceResponse[]> Array of workspace members
 */
export async function getWorkspaceMembersByAlias(alias: string, user: UserLogined): Promise<GetAllWorkspaceResponse[]> {
  if (!alias) {
    throw new ValidationError('Workspace alias is required')
  }

  if (!user || !user.id) {
    return []
  }

  if (!user.current_organization_id) {
    return []
  }

  const workspace = await getWorkspace({ alias, organization_id: user.current_organization_id })
  if (!workspace) {
    return []
  }

  const userWorkspaceMembership = await getWorkspaceUser({ user_id: user.id, workspace_id: workspace.id })

  if (userWorkspaceMembership) {
    const members = await getWorkspaceMembersRepo({ workspaceId: workspace.id })
    const existingEmails = getExistingMemberEmails(members)

    const invitations = await getDetailWorkspaceInvitations({ workspaceId: workspace.id })
    const pendingInvitations = invitations.filter((invitation) => invitation.status === INVITATION_STATUS_PENDING)

    const invitedMembers = createVirtualUsersFromInvitations(pendingInvitations, existingEmails, workspace)

    return [...invitedMembers, ...members]
  }

  if (!user.is_super_admin && (!user.currentOrganizationUser || !canManageOrganization(user.currentOrganizationUser.role))) {
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
 * Function to change workspace member role
 * @param UserLogined user User who wants to change role
 * @param number id ID of the workspace_user record
 * @param WorkspaceUserRole role New role to assign
 * @returns Promise<boolean> True if role was changed successfully
 */
export async function changeWorkspaceMemberRole(user: UserLogined, id: number, role: WorkspaceUserRole): Promise<boolean> {
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

  if (user.id === workspaceMember.user_id) {
    const isOrgManager = user.is_super_admin || (user.currentOrganizationUser && canManageOrganization(user.currentOrganizationUser.role))

    if (!isOrgManager) {
      throw new ApolloError('You cannot change your own role')
    }
  }

  if (role === WORKSPACE_USER_ROLE_OWNER) {
    const isOrgManager = user.is_super_admin || (user.currentOrganizationUser && canManageOrganization(user.currentOrganizationUser.role))

    if (!isOrgManager) {
      throw new ApolloError(`Only organization ${ORGANIZATION_MANAGEMENT_ROLES.join(', ')} can assign ${WORKSPACE_USER_ROLE_OWNER} role`)
    }
  }

  const isOrgManager = user.is_super_admin || (user.currentOrganizationUser && canManageOrganization(user.currentOrganizationUser.role))

  const currentUserWorkspaceMember = await getWorkspaceUser({ user_id: user.id, workspace_id: workspace.id })
  const isWorkspaceManager = currentUserWorkspaceMember && canManageWorkspace(currentUserWorkspaceMember.role)

  if (!isOrgManager && !isWorkspaceManager) {
    throw new ApolloError(`Only organization ${ORGANIZATION_MANAGEMENT_ROLES.join(', ')} or workspace ${WORKSPACE_MANAGEMENT_ROLES.join(', ')} can change member roles`)
  }

  if (workspaceMember.role === WORKSPACE_USER_ROLE_OWNER && !isOrgManager) {
    throw new ApolloError(`Only organization ${ORGANIZATION_MANAGEMENT_ROLES.join(', ')} can change ${WORKSPACE_USER_ROLE_OWNER} role`)
  }

  if (workspaceMember.status === WORKSPACE_USER_STATUS_INACTIVE || workspaceMember.status === WORKSPACE_USER_STATUS_DECLINE) {
    throw new ApolloError(`Role cannot be changed for members with status ${WORKSPACE_USER_STATUS_DECLINE} or ${WORKSPACE_USER_STATUS_INACTIVE}`)
  }

  if (role === WORKSPACE_USER_ROLE_OWNER || workspaceMember.role === WORKSPACE_USER_ROLE_OWNER) {
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
 * @param UserLogined user User who wants to remove member
 * @param number id ID of the workspace_user record
 * @returns Promise<boolean> True if member was removed successfully
 */
export async function removeWorkspaceMember(user: UserLogined, id: number): Promise<boolean> {
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

  const isOrgManager = user.is_super_admin || (user.currentOrganizationUser && canManageOrganization(user.currentOrganizationUser.role))

  const currentUserWorkspaceMember = await getWorkspaceUser({ user_id: user.id, workspace_id: workspace.id })
  const isWorkspaceManager = currentUserWorkspaceMember && canManageWorkspace(currentUserWorkspaceMember.role)

  let isMemberCreator = false

  if (currentUserWorkspaceMember && workspaceMember.invitation_token) {
    const memberInvitations = await getWorkspaceInvitation({ token: workspaceMember.invitation_token })
    const memberInvitation = memberInvitations.length > 0 ? memberInvitations[0] : null

    isMemberCreator = memberInvitation && memberInvitation.invited_by_id === user.id
  }

  if (!isOrgManager && !isWorkspaceManager && !isMemberCreator) {
    throw new ApolloError('You can only remove members that you invited')
  }

  const allMembers = await getWorkspaceMembersRepo({ workspaceId: workspace.id })
  const activeMembers = allMembers.filter((member) => member.status === WORKSPACE_USER_STATUS_ACTIVE)
  const activeOwners = activeMembers.filter((member) => member.role === WORKSPACE_USER_ROLE_OWNER)

  if (workspaceMember.role === WORKSPACE_USER_ROLE_OWNER && !isOrgManager) {
    throw new ForbiddenError('Only organization admin can remove workspace owner')
  }

  if (user.id === workspaceMember.user_id && workspaceMember.role === WORKSPACE_USER_ROLE_OWNER) {
    if (activeOwners.length === 1) {
      throw new ForbiddenError('Cannot leave workspace as the last owner. Transfer ownership first.')
    }
  }

  if (isMemberCreator && !isWorkspaceManager && !isOrgManager && currentUserWorkspaceMember) {
    if (workspaceMember.user_id === user.id) {
      throw new ApolloError('You cannot remove yourself from the workspace')
    }

    if (!isWorkspaceMember(workspaceMember.role)) {
      throw new ApolloError('You can only remove members with member role')
    }
  }

  if (workspaceMember.role === WORKSPACE_USER_ROLE_OWNER && activeOwners.length === 1 && workspaceMember.status === WORKSPACE_USER_STATUS_ACTIVE) {
    throw new ValidationError('Cannot remove the last owner of the workspace')
  }

  if (activeMembers.length === 1 && workspaceMember.status === WORKSPACE_USER_STATUS_ACTIVE) {
    throw new ApolloError('Cannot remove the last active member from workspace')
  }

  let transaction: Knex.Transaction

  try {
    transaction = await database.transaction()

    const removedDomainsCount = await removeWorkspaceDomainsBySiteOwner(workspace.id, workspaceMember.user_id, transaction)
    const tokens = await getInvitationTokensByCreator(workspaceMember.user_id, workspace.id, undefined, transaction)

    await deletePendingWorkspaceMembersByTokens(workspace.id, tokens, transaction)
    await deletePendingInvitationsByCreator(workspaceMember.user_id, workspace.id, undefined, transaction)

    // Delete the workspace_user record
    await deleteWorkspaceUsers(
      {
        user_id: workspaceMember.user_id,
        workspace_id: workspace.id,
      },
      transaction,
    )

    if (workspaceMember.invitation_token && workspaceMember.status === WORKSPACE_USER_STATUS_PENDING) {
      await deleteWorkspaceInvitations(
        {
          token: workspaceMember.invitation_token,
        },
        transaction,
      )
    }

    await transaction.commit()

    logger.info('Workspace member removed', {
      workspace_id: workspace.id,
      removed_member_id: id,
      removed_user_id: workspaceMember.user_id,
      had_invitation_token: !!workspaceMember.invitation_token,
      removed_by: user.id,
      removed_domains_count: removedDomainsCount,
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
 * Helper function to get existing member emails
 * @param GetAllWorkspaceResponse[] members Array of workspace members
 * @returns Set<string> Set of existing emails
 */
function getExistingMemberEmails(members: GetAllWorkspaceResponse[]): Set<string> {
  return new Set(members.map((member) => (member as WorkspaceMemberWithUser).user?.email || (member as WorkspaceMemberWithUser).email).filter(Boolean) as string[])
}
