import { ApolloError } from 'apollo-server-express';
import { createOrganization, updateOrganization, deleteOrganization, getOrganizationBySubdomainExcludeId, getOrganizationBySubdomain, getOrganizationById as getOrganizationByIdRepo, getOrganizationsByIds as getOrganizationByIdsRepo, Organization } from '~/repository/organization.repository';
import { UserProfile } from '~/repository/user.repository';
import { stringToSlug, objectToString } from '~/helpers/string.helper';
import database from '~/config/database.config';
import { addUserToOrganization, getOrganizationsByUserId, getUserOrganization } from './organization_users.service';

import { updateUser } from '~/repository/user.repository';
import logger from '~/libs/logger/application-logger';
import { ORGANIZATION_MANAGEMENT_ROLES, ORGANIZATION_USER_ROLE_OWNER, ORGANIZATION_USER_STATUS_ACTIVE } from '~/constants/organization.constant';

export interface CreateOrganizationInput {
  name: string;
  logo_url?: string;
  settings?: any;
}

export async function addOrganization(data: CreateOrganizationInput, user: UserProfile & { isActive?: number }): Promise<number> {
  const orgLinks = await getOrganizationsByUserId(user.id);
  const maxOrgs = user.isActive ? 3 : 1;

  if (orgLinks.length >= maxOrgs) {
    throw new ApolloError(user.isActive ? 'You have reached the limit of organizations you can create (3 for verified users).' : 'Please verify your email to create more than one organization.');
  }

  const trx = await database.transaction();

  try {
    const subdomain = stringToSlug(data.name).toLowerCase();
    const exists = await getOrganizationBySubdomain(subdomain);

    if (exists) {
      throw new ApolloError('Organization name already exists, please choose another one');
    }

    let orgToCreate = { ...data, subdomain };

    if ('settings' in data) {
      orgToCreate.settings = objectToString(data.settings);
    }

    const ids = await createOrganization(orgToCreate, trx);
    const newOrgId = Number(ids[0]);

    await addUserToOrganization(user.id, newOrgId, ORGANIZATION_USER_ROLE_OWNER, ORGANIZATION_USER_STATUS_ACTIVE, undefined, trx);
    await updateUser(user.id, { current_organization_id: newOrgId }, trx);

    await trx.commit();

    return ids && ids.length > 0 ? ids[0] : null;
  } catch (error) {
    await trx.rollback();
    logger.error('Error creating organization:', error);

    throw error;
  }
}

export async function editOrganization(data: Partial<Organization>, user: UserProfile, organizationId: number | string): Promise<number> {
  await checkOrganizationAccess(user, organizationId, 'You can only edit your own organizations');

  const orgUser = await getUserOrganization(user.id, Number(organizationId));
  const isAllowed = orgUser && ORGANIZATION_MANAGEMENT_ROLES.includes(orgUser.role as (typeof ORGANIZATION_MANAGEMENT_ROLES)[number]);

  if (!isAllowed) {
    throw new ApolloError('Only owner or admin can edit the organization');
  }

  const trx = await database.transaction();

  try {
    let updateData = { ...data };

    if (data.name) {
      updateData.subdomain = stringToSlug(data.name).toLowerCase();

      const exists = await getOrganizationBySubdomainExcludeId(updateData.subdomain, Number(organizationId));

      if (exists) {
        throw new ApolloError('Organization name already exists, please choose another one');
      }
    }

    if ('settings' in updateData) {
      updateData.settings = objectToString(updateData.settings);
    }

    const result = await updateOrganization(Number(organizationId), updateData, trx);

    await trx.commit();

    return result;
  } catch (error) {
    await trx.rollback();
    logger.error('Error updating organization:', error);

    throw error;
  }
}

export async function removeOrganization(user: UserProfile, organizationId: number | string): Promise<number> {
  await checkOrganizationAccess(user, organizationId, 'You can only remove your own organizations');

  const orgUser = await getUserOrganization(user.id, Number(organizationId));
  const isAllowed = orgUser && ORGANIZATION_MANAGEMENT_ROLES.includes(orgUser.role as (typeof ORGANIZATION_MANAGEMENT_ROLES)[number]);

  if (!isAllowed) {
    throw new ApolloError('Only owner or admin can remove the organization');
  }

  const trx = await database.transaction();

  try {
    const deleted = await deleteOrganization(Number(organizationId), trx);

    await trx.commit();

    return deleted;
  } catch (error) {
    await trx.rollback();

    logger.error('Error deleting organization:', error);

    throw error;
  }
}

export async function getOrganizations(user: UserProfile): Promise<Organization[]> {
  try {
    const orgLinks = await getOrganizationsByUserId(user.id);
    const orgIds = orgLinks.map((link) => link.organization_id);

    if (!orgIds.length) return [];

    return await getOrganizationByIdsRepo(orgIds);
  } catch (error) {
    logger.error('Error fetching organizations by user:', error);

    throw error;
  }
}

export async function getOrganizationById(id: number | string, user: UserProfile): Promise<Organization | undefined> {
  await checkOrganizationAccess(user, id, 'You can only access your own organizations');

  try {
    return await getOrganizationByIdRepo(Number(id));
  } catch (error) {
    logger.error('Error fetching organization by id:', error);

    throw error;
  }
}

async function checkOrganizationAccess(user: UserProfile, organizationId: number | string, errorMessage: string) {
  try {
    const orgUser = await getUserOrganization(user.id, Number(organizationId));

    if (!orgUser) {
      throw new ApolloError(errorMessage);
    }
  } catch (error) {
    logger.error('Error checking organization access:', error);

    throw error;
  }
}
