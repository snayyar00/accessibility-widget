import { Knex } from 'knex'

import database from '../../config/database.config'
import { INVITATION_STATUS_ACCEPTED } from '../../constants/invitation.constant'
import { ORGANIZATION_MANAGEMENT_ROLES } from '../../constants/organization.constant'
import { WORKSPACE_USER_STATUS_PENDING } from '../../constants/workspace.constant'
import { deleteOrganizationInvitations, deleteWorkspaceInvitations, GetDetailWorkspaceInvitation, getDetailWorkspaceInvitations, getOrganizationInvitation, getWorkspaceInvitation } from '../../repository/invitations.repository'
import { UserProfile } from '../../repository/user.repository'
import { GetAllWorkspaceResponse, getWorkspace, Workspace } from '../../repository/workspace.repository'
import { deleteWorkspaceUsers, getWorkspaceUser } from '../../repository/workspace_users.repository'
import { canManageOrganization, canManageWorkspace } from '../../utils/access.helper'
import { ApolloError, ValidationError } from '../../utils/graphql-errors.helper'
import logger from '../../utils/logger'
import { validateRemoveWorkspaceInvitation } from '../../validations/workspace.validation'
import { getUserOrganization } from '../organization/organization_users.service'

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
 * Get workspace invitations by workspace alias
 * @param alias - Workspace alias
 * @param user - User profile
 * @returns Promise<GetDetailWorkspaceInvitation[]> Array of workspace invitations
 */
export async function getWorkspaceInvitationsByAlias(alias: string, user: UserProfile): Promise<GetDetailWorkspaceInvitation[]> {
  if (!alias) {
    throw new ValidationError('Workspace alias is required')
  }

  if (!user.current_organization_id) {
    return []
  }

  const workspace = await getWorkspace({ alias, organization_id: user.current_organization_id })

  if (!workspace) {
    return []
  }

  const userOrganization = await getUserOrganization(user.id, user.current_organization_id)
  const isOrgManager = user.is_super_admin || (userOrganization && canManageOrganization(userOrganization.role))

  const workspaceMember = await getWorkspaceUser({ user_id: user.id, workspace_id: workspace.id })
  const isWorkspaceMember = !!workspaceMember // Any workspace member can view invitations

  if (!isOrgManager && !isWorkspaceMember) {
    return []
  }

  const invitations = await getDetailWorkspaceInvitations({ workspaceId: workspace.id })

  return invitations
}

/**
 * Remove a workspace invitation
 * @param user - User profile
 * @param id - Invitation ID
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

  const [invitation] = await getWorkspaceInvitation({ id })

  if (!invitation) {
    throw new ApolloError('Invitation not found')
  }

  const workspace = await getWorkspace({ id: invitation.workspace_id, organization_id: user.current_organization_id })

  if (!workspace) {
    throw new ApolloError('Workspace not found or access denied')
  }

  const orgUser = await getUserOrganization(user.id, Number(user.current_organization_id))
  const isOrgManager = user.is_super_admin || (orgUser && canManageOrganization(orgUser.role))

  const workspaceMember = await getWorkspaceUser({ user_id: user.id, workspace_id: workspace.id })
  const isWorkspaceManager = workspaceMember && canManageWorkspace(workspaceMember.role)

  const isInvitationCreator = workspaceMember && invitation.invited_by_id === user.id

  if (!isOrgManager && !isWorkspaceManager && !isInvitationCreator) {
    throw new ApolloError('You can only remove invitations that you created')
  }

  if (isInvitationCreator && !isOrgManager && !isWorkspaceManager) {
    if (invitation.workspace_role && canManageWorkspace(invitation.workspace_role)) {
      throw new ApolloError('You can only remove invitations with member role')
    }
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
 * Remove all workspace invitations for a user by email
 * @param user - User profile
 * @param email - Email of the user whose invitations should be removed
 * @returns Promise<boolean> True if invitations were removed successfully
 */
export async function removeAllUserInvitations(user: UserProfile, email: string): Promise<boolean> {
  if (!user.current_organization_id) {
    throw new ApolloError('No current organization selected')
  }

  const orgUser = await getUserOrganization(user.id, Number(user.current_organization_id))
  const isAllowed = user.is_super_admin || (orgUser && canManageOrganization(orgUser.role))

  if (!isAllowed) {
    throw new ApolloError(`Only organization ${ORGANIZATION_MANAGEMENT_ROLES.join(', ')} can remove workspace invitations`)
  }

  let transaction: Knex.Transaction

  try {
    transaction = await database.transaction()

    const workspaceInvitations = await getWorkspaceInvitation({
      email,
      organization_id: user.current_organization_id,
    })

    const organizationInvitations = await getOrganizationInvitation({
      email,
      organization_id: user.current_organization_id,
    })

    if (workspaceInvitations.length === 0 && organizationInvitations.length === 0) {
      await transaction.rollback()
      throw new ApolloError('No invitations found for this email')
    }

    if (workspaceInvitations.length > 0) {
      await deleteWorkspaceInvitations(
        {
          email,
          organization_id: user.current_organization_id,
        },
        transaction,
      )

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
 * Helper function to create virtual users from workspace invitations
 * @param invitations - Array of workspace invitations
 * @param existingEmails - Set of existing member emails to filter out
 * @param workspace - Workspace object for context
 * @returns Array of virtual users
 */
export function createVirtualUsersFromInvitations(invitations: GetDetailWorkspaceInvitation[], existingEmails: Set<string>, workspace: Workspace): (GetAllWorkspaceResponse & WorkspaceMemberWithUser)[] {
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
        invited_by: invitation.invited_by_id,
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
