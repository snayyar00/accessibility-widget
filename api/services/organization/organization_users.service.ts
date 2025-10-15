import { Knex } from 'knex'

import { ORGANIZATION_USER_ROLE_MEMBER, ORGANIZATION_USER_ROLE_OWNER, ORGANIZATION_USER_STATUS_INVITED, OrganizationUserRole, OrganizationUserStatus } from '../../constants/organization.constant'
import { WORKSPACE_INVITATION_STATUS_PENDING } from '../../constants/workspace.constant'
import { GetDetailWorkspaceInvitation, getOrganizationInvitations } from '../../repository/invitations.repository'
import { deleteOrganizationUser, getOrganizationUser, getOrganizationUsersByUserId, getOrganizationUsersWithUserInfo, insertOrganizationUser, OrganizationUser, updateOrganizationUserByOrganizationAndUserId } from '../../repository/organization_user.repository'
import { UserProfile } from '../../repository/user.repository'
import { canManageOrganization } from '../../utils/access.helper'
import { ApolloError } from '../../utils/graphql-errors.helper'
import logger from '../../utils/logger'

export async function addUserToOrganization(user_id: number, organization_id: number, role: OrganizationUserRole = 'member', status: OrganizationUserStatus = 'active', trx?: Knex.Transaction): Promise<number[]> {
  try {
    return await insertOrganizationUser({ user_id, organization_id, role, status }, trx)
  } catch (error) {
    logger.error('Error adding user to organization:', error)

    throw error
  }
}

export async function getUserOrganization(user_id: number, organization_id: number): Promise<OrganizationUser | undefined> {
  try {
    return await getOrganizationUser(user_id, organization_id)
  } catch (error) {
    logger.error('Error getting user-organization relation:', error)

    throw error
  }
}

export async function getOrganizationsByUserId(userId: number): Promise<OrganizationUser[]> {
  try {
    return await getOrganizationUsersByUserId(userId)
  } catch (error) {
    logger.error('Error getting organizations of user:', error)

    throw error
  }
}

export async function removeUserFromOrganization(id: number, trx?: Knex.Transaction): Promise<number> {
  try {
    return await deleteOrganizationUser(id, trx)
  } catch (error) {
    logger.error('Error removing user from organization:', error)

    throw error
  }
}

export async function getOrganizationUsers(user: UserProfile) {
  const { id: userId, current_organization_id: organizationId } = user

  if (!userId || !organizationId) {
    logger.warn('getOrganizationUsers: No current organization or userId', { userId, organizationId })
    return []
  }

  const orgUser = await getUserOrganization(userId, organizationId)

  if (!orgUser || !canManageOrganization(orgUser.role)) {
    logger.warn('getOrganizationUsers: No permission to view organization users', { userId, organizationId, orgUser })
    return []
  }

  const users = await getOrganizationUsersWithUserInfo(organizationId)
  const myOrgs = await getOrganizationsByUserId(userId)
  const allowedOrgIds = myOrgs.filter((o) => canManageOrganization(o.role)).map((o) => o.organization_id)

  const existingUsers = users.map((user) => ({
    ...user,
    organizations: user.organizations.filter((org) => allowedOrgIds.includes(org.id)),
    currentOrganization: user.currentOrganization && allowedOrgIds.includes(user.currentOrganization.id) ? user.currentOrganization : null,
  }))

  const invitations = await getOrganizationInvitations(organizationId)
  const existingEmails = new Set(existingUsers.map((user) => user.user.email))
  const pendingInvitations = invitations.filter((invitation) => invitation.status === WORKSPACE_INVITATION_STATUS_PENDING)

  const invitedUsers = await createInvitedUsersFromInvitations(pendingInvitations, organizationId, existingEmails)

  return [...invitedUsers, ...existingUsers]
}

export async function changeOrganizationUserRole(initiator: UserProfile, targetUserId: number, newRole: OrganizationUserRole): Promise<boolean> {
  const organizationId = initiator.current_organization_id

  if (!organizationId) {
    throw new ApolloError('No current organization selected')
  }

  const initiatorOrgUser = await getUserOrganization(initiator.id, organizationId)
  const isAllowed = initiatorOrgUser && canManageOrganization(initiatorOrgUser.role)

  if (!isAllowed) {
    throw new ApolloError('Only owner or admin can change user roles')
  }

  if (initiator.id === targetUserId) {
    throw new ApolloError('You cannot change your own role')
  }

  const targetOrgUser = await getUserOrganization(targetUserId, organizationId)

  if (!targetOrgUser) {
    throw new ApolloError('User not found in organization')
  }

  if (targetOrgUser.role === ORGANIZATION_USER_ROLE_OWNER && initiatorOrgUser.role !== ORGANIZATION_USER_ROLE_OWNER) {
    throw new ApolloError('Only owner can change owner role')
  }

  if (newRole === ORGANIZATION_USER_ROLE_OWNER && initiatorOrgUser.role !== ORGANIZATION_USER_ROLE_OWNER) {
    throw new ApolloError('Only owner can assign owner role')
  }

  try {
    const updatedRows = await updateOrganizationUserByOrganizationAndUserId(organizationId, targetUserId, { role: newRole })

    if (updatedRows === 0) {
      throw new ApolloError('Failed to update user role')
    }

    logger.info(`User ${initiator.id} changed role of user ${targetUserId} to ${newRole} in organization ${organizationId}`)

    return true
  } catch (error) {
    logger.error('Error changing organization user role:', error)
    throw error
  }
}

async function createInvitedUsersFromInvitations(invitations: GetDetailWorkspaceInvitation[], organizationId: number, existingEmails: Set<string>) {
  return invitations
    .filter((invitation) => !existingEmails.has(invitation.email))
    .reduce((acc, invitation) => {
      // Group by email to avoid duplicates from multiple workspace invitations
      let existingInvite = acc.find((u) => u.user.email === invitation.email)

      if (!existingInvite) {
        // Simple virtual IDs for invited users - use acc.length for unique sequential IDs
        const virtualUserId = -(acc.length + 1000) // -1000, -1001, -1002, etc.
        const virtualOrgUserId = `invited-${acc.length}-${invitation.email.replace(/[^a-zA-Z0-9]/g, '-')}`

        existingInvite = {
          id: virtualOrgUserId,
          user_id: virtualUserId,
          organization_id: organizationId,
          role: ORGANIZATION_USER_ROLE_MEMBER,
          status: ORGANIZATION_USER_STATUS_INVITED,
          created_at: invitation.created_at,
          updated_at: null,
          current_workspace_id: null,
          organizations: [],
          workspaces: [],
          invitationId: invitation.id,
          user: {
            id: virtualUserId,
            email: invitation.email,
            name: invitation.email.split('@')[0],
            current_organization_id: null,
            isActive: false,
          },
          currentOrganization: null,
        }

        acc.push(existingInvite)
      }

      if (invitation.workspace_name && invitation.workspace_id) {
        existingInvite.workspaces.push({
          id: invitation.workspace_id,
          name: invitation.workspace_name,
          alias: invitation.workspace_alias,
        })
      }

      return acc
    }, [])
}
