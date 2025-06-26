import logger from '~/utils/logger';
import {
  insertOrganizationUser,
  getOrganizationUser,
  getOrganizationUsersByUserId,
  getOrganizationUsersByOrganizationId,
  updateOrganizationUser,
  deleteOrganizationUser,
  OrganizationUser
} from '~/repository/organization_users.repository';
import { OrganizationUserRole, OrganizationUserStatus } from '~/constants/database.constant';
import { ORGANIZATION_MANAGEMENT_ROLES } from '~/constants/organization.constant';
import Knex from 'knex';
import { UserProfile } from '~/repository/user.repository';

export async function addUserToOrganization(
  user_id: number,
  organization_id: number,
  role: OrganizationUserRole = 'member',
  status: OrganizationUserStatus = 'active',
  invited_by?: number,
  trx?: Knex.Transaction
): Promise<number[]> {
  try {
    return await insertOrganizationUser({ user_id, organization_id, role, status, invited_by }, trx);
  } catch (error) {
    logger.error('Error adding user to organization:', error);
    if (!(error as any).code) (error as any).code = 'ORG_USER_ADD_ERROR';
    
    throw error;
  }
}

export async function getUserOrganization(user_id: number, organization_id: number): Promise<OrganizationUser | undefined> {
  try {
    return await getOrganizationUser(user_id, organization_id);
  } catch (error) {
    logger.error('Error getting user-organization relation:', error);
    if (!(error as any).code) (error as any).code = 'ORG_USER_GET_ERROR';

    throw error;
  }
}

export async function getOrganizationsByUserId(userId: number): Promise<OrganizationUser[]> {
  try {
    return await getOrganizationUsersByUserId(userId);
  } catch (error) {
    logger.error('Error getting organizations of user:', error);
    if (!(error as any).code) (error as any).code = 'ORG_USER_LIST_ERROR';

    throw error;
  }
}

export async function getUsersByOrganizationId(organizationId: number): Promise<OrganizationUser[]> {
  try {
    return await getOrganizationUsersByOrganizationId(organizationId);
  } catch (error) {
    logger.error('Error getting users of organization:', error);
    if (!(error as any).code) (error as any).code = 'ORG_USER_LIST_ERROR';

    throw error;
  }
}

export async function updateUserOrganization(id: number, data: Partial<OrganizationUser>, trx?: Knex.Transaction): Promise<number> {
  try {
    return await updateOrganizationUser(id, data, trx);
  } catch (error) {
    logger.error('Error updating user-organization relation:', error);
    if (!(error as any).code) (error as any).code = 'ORG_USER_UPDATE_ERROR';

    throw error;
  }
}

export async function removeUserFromOrganization(id: number, trx?: Knex.Transaction): Promise<number> {
  try {
    return await deleteOrganizationUser(id, trx);
  } catch (error) {
    logger.error('Error removing user from organization:', error);
    if (!(error as any).code) (error as any).code = 'ORG_USER_REMOVE_ERROR';

    throw error;
  }
}

export async function getOrganizationUsersWithAccess(user: UserProfile) {
  const { id: userId, current_organization_id: organizationId } = user;

  if (!userId || !organizationId) {
    const error = new Error('No current organization selected');
    (error as any).code = 'ORG_NO_CURRENT_ORG';
    
    throw error;
  }

  const orgUser = await getUserOrganization(userId, organizationId);

  if (!orgUser || !ORGANIZATION_MANAGEMENT_ROLES.includes(orgUser.role as typeof ORGANIZATION_MANAGEMENT_ROLES[number])) {
    const error = new Error('Access denied: only owner or admin can view organization users');
    (error as any).code = 'ORG_USERS_ACCESS_DENIED';

    throw error;
  }

  return getUsersByOrganizationId(organizationId);
}
