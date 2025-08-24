import { Knex } from 'knex'

import { OrganizationUserRole, OrganizationUserStatus } from '../../constants/organization.constant'
import { deleteOrganizationUser, getOrganizationUser, getOrganizationUsersByUserId, getOrganizationUsersWithUserInfo, insertOrganizationUser, OrganizationUser } from '../../repository/organization_user.repository'
import { UserProfile } from '../../repository/user.repository'
import { canManageOrganization } from '../../utils/access.helper'
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

  return users.map((user) => ({
    ...user,
    organizations: user.organizations.filter((org) => allowedOrgIds.includes(org.id)),
    currentOrganization: user.currentOrganization && allowedOrgIds.includes(user.currentOrganization.id) ? user.currentOrganization : null,
  }))
}
