import Knex from 'knex';
import { UserProfile } from '../../repository/user.repository';
import { ORGANIZATION_MANAGEMENT_ROLES, OrganizationUserRole, OrganizationUserStatus } from '../../constants/organization.constant';
import logger from '../../config/logger.config';
import { deleteOrganizationUser, getOrganizationUser, getOrganizationUsersByOrganizationId, getOrganizationUsersByUserId, insertOrganizationUser, OrganizationUser, updateOrganizationUser } from '../../repository/organization_user.repository';

export async function addUserToOrganization(user_id: number, organization_id: number, role: OrganizationUserRole = 'member', status: OrganizationUserStatus = 'active', trx?: Knex.Transaction): Promise<number[]> {
  try {
    return await insertOrganizationUser({ user_id, organization_id, role, status }, trx);
  } catch (error) {
    logger.error('Error adding user to organization:', error);

    throw error;
  }
}

export async function getUserOrganization(user_id: number, organization_id: number): Promise<OrganizationUser | undefined> {
  try {
    return await getOrganizationUser(user_id, organization_id);
  } catch (error) {
    logger.error('Error getting user-organization relation:', error);

    throw error;
  }
}

export async function getOrganizationsByUserId(userId: number): Promise<OrganizationUser[]> {
  try {
    return await getOrganizationUsersByUserId(userId);
  } catch (error) {
    logger.error('Error getting organizations of user:', error);

    throw error;
  }
}

export async function getUsersByOrganizationId(organizationId: number): Promise<OrganizationUser[]> {
  try {
    return await getOrganizationUsersByOrganizationId(organizationId);
  } catch (error) {
    logger.error('Error getting users of organization:', error);

    throw error;
  }
}

export async function updateUserOrganization(id: number, data: Partial<OrganizationUser>, trx?: Knex.Transaction): Promise<number> {
  try {
    return await updateOrganizationUser(id, data, trx);
  } catch (error) {
    logger.error('Error updating user-organization relation:', error);

    throw error;
  }
}

export async function removeUserFromOrganization(id: number, trx?: Knex.Transaction): Promise<number> {
  try {
    return await deleteOrganizationUser(id, trx);
  } catch (error) {
    logger.error('Error removing user from organization:', error);

    throw error;
  }
}

export async function getOrganizationUsers(user: UserProfile) {
  const { id: userId, current_organization_id: organizationId } = user;

  if (!userId || !organizationId) {
    logger.warn('getOrganizationUsers: No current organization or userId', { userId, organizationId });
    return [];
  }

  const orgUser = await getUserOrganization(userId, organizationId);

  if (!orgUser || !ORGANIZATION_MANAGEMENT_ROLES.includes(orgUser.role as (typeof ORGANIZATION_MANAGEMENT_ROLES)[number])) {
    logger.warn('getOrganizationUsers: No permission to view organization users', { userId, organizationId, orgUser });
    return [];
  }

  return getUsersByOrganizationId(organizationId);
}
