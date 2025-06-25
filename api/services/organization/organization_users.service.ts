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
import Knex from 'knex';

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

export async function getOrganizationsOfUser(user_id: number): Promise<OrganizationUser[]> {
  try {
    return await getOrganizationUsersByUserId(user_id);
  } catch (error) {
    logger.error('Error getting organizations of user:', error);

    if (!(error as any).code) (error as any).code = 'ORG_USER_LIST_ERROR';
    throw error;
  }
}

export async function getUsersOfOrganization(organization_id: number): Promise<OrganizationUser[]> {
  try {
    return await getOrganizationUsersByOrganizationId(organization_id);
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

export async function isUserOwner(user_id: number, organization_id: number): Promise<boolean> {
  try {
    const orgUser = await getOrganizationUser(user_id, organization_id);
    return orgUser?.role === 'owner';
  } catch (error) {
    logger.error('Error checking user owner status:', error);

    if (!(error as any).code) (error as any).code = 'ORG_USER_OWNER_ERROR';
    throw error;
  }
}
