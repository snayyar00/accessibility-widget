import { Knex } from 'knex'

import { INVITATION_STATUS_PENDING } from '../../constants/invitation.constant'
import { ORGANIZATION_MANAGEMENT_ROLES, ORGANIZATION_USER_ROLE_MEMBER, ORGANIZATION_USER_ROLE_OWNER, ORGANIZATION_USER_STATUS_ACTIVE, ORGANIZATION_USER_STATUS_PENDING, OrganizationUserRole, OrganizationUserStatus } from '../../constants/organization.constant'
import { GetDetailOrganizationInvitation, GetDetailWorkspaceInvitation, getOrganizationInvitations, getOrganizationWorkspaceInvitations } from '../../repository/invitations.repository'
import { deleteOrganizationUser, getOrganizationUser, getOrganizationUsersByOrganizationId, getOrganizationUsersByUserId, getOrganizationUsersWithUserInfo, insertOrganizationUser, OrganizationUser, updateOrganizationUserByOrganizationAndUserId } from '../../repository/organization_user.repository'
import { findUsersByEmails, UserProfile } from '../../repository/user.repository'
import { canManageOrganization } from '../../utils/access.helper'
import { ApolloError } from '../../utils/graphql-errors.helper'
import logger from '../../utils/logger'
import { UserLogined } from '../authentication/get-user-logined.service'

export async function addUserToOrganization(user_id: number, organization_id: number, role: OrganizationUserRole = ORGANIZATION_USER_ROLE_MEMBER, status: OrganizationUserStatus = ORGANIZATION_USER_STATUS_ACTIVE, trx?: Knex.Transaction): Promise<number[]> {
  try {
    if (role === ORGANIZATION_USER_ROLE_OWNER) {
      const allOrgUsers = await getOrganizationUsersByOrganizationId(organization_id)
      const existingOwner = allOrgUsers.find((user) => user.role === ORGANIZATION_USER_ROLE_OWNER)

      if (existingOwner) {
        throw new ApolloError(`Organization can have only one ${ORGANIZATION_USER_ROLE_OWNER}. Please change the current owner role first.`)
      }
    }

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

export async function getOrganizationUsers(user: UserLogined, search?: string) {
  const { id: userId, current_organization_id: organizationId } = user

  if (!userId || !organizationId) {
    logger.warn('getOrganizationUsers: No current organization or userId', { userId, organizationId })
    return []
  }

  if (!user.is_super_admin) {
    if (!user.currentOrganizationUser || !canManageOrganization(user.currentOrganizationUser.role)) {
      logger.warn('getOrganizationUsers: No permission to view organization users', { userId, organizationId, orgUser: user.currentOrganizationUser })
      return []
    }
  }

  const users = await getOrganizationUsersWithUserInfo(organizationId, search)
  const myOrgs = await getOrganizationsByUserId(userId)
  const allowedOrgIds = user.is_super_admin ? users.flatMap((u) => u.organizations.map((o) => o.id)) : myOrgs.filter((o) => o.role && canManageOrganization(o.role)).map((o) => o.organization_id)

  const existingUsers = users.map((user) => ({
    ...user,
    organizations: user.organizations.filter((org) => allowedOrgIds.includes(org.id)),
    currentOrganization: user.currentOrganization && allowedOrgIds.includes(user.currentOrganization.id) ? user.currentOrganization : null,
  }))

  const orgInvitations = await getOrganizationInvitations(organizationId)
  const pendingOrgInvitations = orgInvitations.filter((invitation) => invitation.status === INVITATION_STATUS_PENDING)

  const workspaceInvitations = await getOrganizationWorkspaceInvitations(organizationId)
  const pendingWorkspaceInvitations = workspaceInvitations.filter((invitation) => invitation.status === INVITATION_STATUS_PENDING)

  const existingEmails = new Set(existingUsers.map((user) => user.user.email))
  const invitationEmails = new Set([...pendingOrgInvitations.map((i) => i.email), ...pendingWorkspaceInvitations.map((i) => i.email)])

  const emailsToLookup = Array.from(invitationEmails).filter((email) => !existingEmails.has(email))
  const realUsersForInvitations = await findUsersByEmails(emailsToLookup)
  const realUsersMap = new Map(realUsersForInvitations.map((u) => [u.email, u]))

  const invitedOrgUsers = createInvitedUsersFromInvitations(pendingOrgInvitations, organizationId, existingEmails, realUsersMap)

  const allExistingEmails = new Set([...existingEmails, ...invitedOrgUsers.map((u) => u.user.email)])

  const invitedWorkspaceUsers = createInvitedUsersFromWorkspaceInvitations(pendingWorkspaceInvitations, organizationId, allExistingEmails, realUsersMap)

  const mergedOrgUsers = mergeInvitedUsers(invitedOrgUsers, pendingWorkspaceInvitations)

  const allUsers = [...mergedOrgUsers, ...invitedWorkspaceUsers, ...existingUsers]

  // Apply search filter to all users (including invited users)
  if (search && search.trim().length > 0) {
    const searchLower = search.trim().toLowerCase()
    return allUsers.filter((user) => {
      const matchesName = (user.user?.name || '').toLowerCase().includes(searchLower)
      const matchesEmail = (user.user?.email || '').toLowerCase().includes(searchLower)
      const matchesId = user.user_id?.toString().includes(searchLower)
      return matchesName || matchesEmail || matchesId
    })
  }

  return allUsers
}

export async function changeOrganizationUserRole(initiator: UserLogined, targetUserId: number, newRole: OrganizationUserRole): Promise<boolean> {
  const organizationId = initiator.current_organization_id

  if (!organizationId) {
    throw new ApolloError('No current organization selected')
  }

  if (initiator.id === targetUserId && !initiator.is_super_admin) {
    throw new ApolloError('You cannot change your own role')
  }

  const targetOrgUser = await getUserOrganization(targetUserId, organizationId)

  if (!targetOrgUser) {
    throw new ApolloError('User not found in organization')
  }

  if (newRole === ORGANIZATION_USER_ROLE_OWNER && !initiator.is_super_admin) {
    throw new ApolloError(`Only super admin can assign ${ORGANIZATION_USER_ROLE_OWNER} role`)
  }

  if (!initiator.is_super_admin) {
    const isAllowed = initiator.currentOrganizationUser && canManageOrganization(initiator.currentOrganizationUser.role)

    if (!isAllowed) {
      throw new ApolloError(`Only ${ORGANIZATION_MANAGEMENT_ROLES.join(', ')} can change user roles`)
    }

    if (targetOrgUser.role === ORGANIZATION_USER_ROLE_OWNER) {
      throw new ApolloError(`Only super admin can change ${ORGANIZATION_USER_ROLE_OWNER} role`)
    }
  }

  if (newRole === ORGANIZATION_USER_ROLE_OWNER || targetOrgUser.role === ORGANIZATION_USER_ROLE_OWNER) {
    // Skip check if not actually changing the role
    if (targetOrgUser.role !== newRole) {
      const allInvitations = await getOrganizationInvitations(organizationId)
      const pendingOwnerInvitation = allInvitations.find((inv) => inv.role === ORGANIZATION_USER_ROLE_OWNER && inv.status === INVITATION_STATUS_PENDING)

      if (pendingOwnerInvitation) {
        if (targetOrgUser.role === ORGANIZATION_USER_ROLE_OWNER && newRole !== ORGANIZATION_USER_ROLE_OWNER) {
          throw new ApolloError(`Cannot change ${ORGANIZATION_USER_ROLE_OWNER} role while there is a pending invitation for ${ORGANIZATION_USER_ROLE_OWNER} role. Please cancel the invitation first.`)
        }
        if (newRole === ORGANIZATION_USER_ROLE_OWNER && targetOrgUser.role !== ORGANIZATION_USER_ROLE_OWNER) {
          throw new ApolloError(`There is already a pending invitation for ${ORGANIZATION_USER_ROLE_OWNER} role. Please cancel it before assigning a new ${ORGANIZATION_USER_ROLE_OWNER}.`)
        }
      }
    }
  }

  // Check if trying to assign owner role - only one owner allowed per organization
  if (newRole === ORGANIZATION_USER_ROLE_OWNER) {
    const allOrgUsers = await getOrganizationUsersByOrganizationId(organizationId)
    const existingOwner = allOrgUsers.find((user) => user.role === ORGANIZATION_USER_ROLE_OWNER && user.user_id !== targetUserId)

    if (existingOwner) {
      throw new ApolloError(`Organization can have only one ${ORGANIZATION_USER_ROLE_OWNER}. Please change the current ${ORGANIZATION_USER_ROLE_OWNER} role first.`)
    }
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

function createInvitedUsersFromInvitations(invitations: GetDetailOrganizationInvitation[], organizationId: number, existingEmails: Set<string>, realUsersMap: Map<string, UserProfile>) {
  return invitations
    .filter((invitation) => !existingEmails.has(invitation.email))
    .map((invitation) => {
      const realUser = realUsersMap.get(invitation.email)

      if (realUser) {
        // Real user exists - show their data with PENDING status
        return {
          id: `invited-org-${invitation.id}-real-${realUser.id}`,
          user_id: realUser.id,
          organization_id: organizationId,
          role: invitation.role || ORGANIZATION_USER_ROLE_MEMBER,
          status: ORGANIZATION_USER_STATUS_PENDING,
          created_at: invitation.created_at,
          updated_at: null as string | null,
          organizations: [] as { id: number; name: string; domain: string }[],
          workspaces: [] as { id: number; name: string; alias: string }[],
          invitationId: invitation.id,
          user: {
            id: realUser.id,
            email: realUser.email,
            name: realUser.name,
            current_organization_id: realUser.current_organization_id,
            isActive: Boolean(realUser.is_active),
          },
          currentOrganization: null as { id: number; name: string; domain: string } | null,
        }
      }

      // Virtual user - doesn't exist in system
      const virtualUserId = -(invitation.id + 1000)
      const virtualOrgUserId = `invited-org-${invitation.id}-${invitation.email.replace(/[^a-zA-Z0-9]/g, '-')}`

      return {
        id: virtualOrgUserId,
        user_id: virtualUserId,
        organization_id: organizationId,
        role: invitation.role || ORGANIZATION_USER_ROLE_MEMBER,
        status: ORGANIZATION_USER_STATUS_PENDING,
        created_at: invitation.created_at,
        updated_at: null as string | null,
        organizations: [] as { id: number; name: string; domain: string }[],
        workspaces: [] as { id: number; name: string; alias: string }[],
        invitationId: invitation.id,
        user: {
          id: virtualUserId,
          email: invitation.email,
          name: invitation.email.split('@')[0],
          current_organization_id: null as number | null,
          isActive: false,
        },
        currentOrganization: null as { id: number; name: string; domain: string } | null,
      }
    })
}

function createInvitedUsersFromWorkspaceInvitations(invitations: GetDetailWorkspaceInvitation[], organizationId: number, existingEmails: Set<string>, realUsersMap: Map<string, UserProfile>) {
  return invitations
    .filter((invitation) => !existingEmails.has(invitation.email))
    .reduce(
      (acc, invitation) => {
        // Group by email to avoid duplicates from multiple workspace invitations
        let existingInvite = acc.find((u) => u.user.email === invitation.email)

        if (!existingInvite) {
          const realUser = realUsersMap.get(invitation.email)

          if (realUser) {
            // Real user exists - show their data with PENDING status
            existingInvite = {
              id: `invited-ws-${invitation.id}-real-${realUser.id}`,
              user_id: realUser.id,
              organization_id: organizationId,
              role: ORGANIZATION_USER_ROLE_MEMBER,
              status: ORGANIZATION_USER_STATUS_PENDING,
              created_at: invitation.created_at,
              updated_at: null as string | null,
              organizations: [] as { id: number; name: string; domain: string }[],
              workspaces: [] as { id: number; name: string; alias: string }[],
              invitationId: invitation.id,
              user: {
                id: realUser.id,
                email: realUser.email,
                name: realUser.name,
                current_organization_id: realUser.current_organization_id,
                isActive: Boolean(realUser.is_active),
              },
              currentOrganization: null as { id: number; name: string; domain: string } | null,
            }
          } else {
            // Virtual user - doesn't exist in system
            const virtualUserId = -(invitation.id + 5000)
            const virtualOrgUserId = `invited-ws-${invitation.id}-${invitation.email.replace(/[^a-zA-Z0-9]/g, '-')}`

            existingInvite = {
              id: virtualOrgUserId,
              user_id: virtualUserId,
              organization_id: organizationId,
              role: ORGANIZATION_USER_ROLE_MEMBER,
              status: ORGANIZATION_USER_STATUS_PENDING,
              created_at: invitation.created_at,
              updated_at: null as string | null,
              organizations: [] as { id: number; name: string; domain: string }[],
              workspaces: [] as { id: number; name: string; alias: string }[],
              invitationId: invitation.id,
              user: {
                id: virtualUserId,
                email: invitation.email,
                name: invitation.email.split('@')[0],
                current_organization_id: null as number | null,
                isActive: false,
              },
              currentOrganization: null as { id: number; name: string; domain: string } | null,
            }
          }

          acc.push(existingInvite)
        }

        // Add workspace to the list
        if (invitation.workspace_name && invitation.workspace_id) {
          existingInvite.workspaces.push({
            id: invitation.workspace_id,
            name: invitation.workspace_name,
            alias: invitation.workspace_alias,
          })
        }

        return acc
      },
      [] as ReturnType<typeof createInvitedUsersFromInvitations>,
    )
}

/**
 * Merge workspace invitations into organization users if they have the same email
 */
function mergeInvitedUsers(orgUsers: ReturnType<typeof createInvitedUsersFromInvitations>, workspaceInvitations: GetDetailWorkspaceInvitation[]) {
  const emailToOrgUser = new Map(orgUsers.map((user) => [user.user.email, user]))

  // Add workspaces to organization users with matching emails
  for (const invitation of workspaceInvitations) {
    const orgUser = emailToOrgUser.get(invitation.email)
    if (orgUser && invitation.workspace_name && invitation.workspace_id) {
      orgUser.workspaces.push({
        id: invitation.workspace_id,
        name: invitation.workspace_name,
        alias: invitation.workspace_alias,
      })
    }
  }

  return orgUsers
}
