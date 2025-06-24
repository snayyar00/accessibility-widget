import logger from '~/utils/logger';
import {
  createOrganization,
  updateOrganization,
  deleteOrganization,
  getOrganizationBySubdomainExcludeId,
  getOrganizationBySubdomain,
  getOrganizationById as getOrganizationByIdRepo,
  getOrganizationsByIds as getOrganizationByIdsRepo,
  Organization
} from '~/repository/organization.repository';
import { updateUser, UserProfile } from '~/repository/user.repository';
import { stringToSlug, objectToString } from '~/helpers/string.helper';
import database from '~/config/database.config';

export interface CreateOrganizationInput {
  name: string;
  logo_url?: string;
  settings?: any;
}

function checkOrganizationAccess(user: UserProfile, id: number | string, errorMessage: string) {
  const numId = Number(id);

  if (!user.organization_ids || !user.organization_ids.map(Number).includes(numId)) {
    const error = new Error(errorMessage);
    (error as any).code = 'ORG_ACCESS_DENIED';
    throw error;
  }
}

export async function addOrganization(data: CreateOrganizationInput, user: UserProfile): Promise<number> {
  const maxOrgs = user.is_active ? 3 : 1;
  const currentOrgs = Array.isArray(user.organization_ids) ? user.organization_ids.length : 0;

  if (currentOrgs >= maxOrgs) {
    const error = new Error(
      user.is_active
        ? 'You have reached the limit of organizations you can create (3 for verified users).'
        : 'Please verify your email to create more than one organization.'
    );
    (error as any).code = user.is_active ? 'ORG_LIMIT_VERIFIED' : 'ORG_LIMIT_UNVERIFIED';
    throw error;
  }

  const trx = await database.transaction();

  try {
    const subdomain = stringToSlug(data.name).toLowerCase();
    const exists = await getOrganizationBySubdomain(subdomain);

    if (exists) {
      const error = new Error('Organization name already exists, please choose another one');
      (error as any).code = 'ORG_EXISTS';
      throw error;
    }

    let orgToCreate = { ...data, subdomain };

    if ('settings' in data) {
      orgToCreate.settings = objectToString(data.settings);
    }

    const ids = await createOrganization(orgToCreate, trx);
    const newOrgId = Number(ids[0]);
    const updatedIds = Array.isArray(user.organization_ids)
      ? [...user.organization_ids.map(Number), newOrgId]
      : [newOrgId];

    await updateUser(Number(user.id), {
      organization_ids: updatedIds,
      current_organization_id: newOrgId
    }, trx);

    await trx.commit();

    return ids && ids.length > 0 ? ids[0] : null;
  } catch (error) {
    await trx.rollback();
    logger.error('Error creating organization:', error);
    if (!(error as any).code) (error as any).code = 'ORG_CREATE_ERROR';
    throw error;
  }
}

export async function editOrganization(
  data: Partial<Organization>,
  user: UserProfile,
  organizationId: number | string
): Promise<number> {
  checkOrganizationAccess(user, organizationId, 'You can only edit your own organizations');
  const trx = await database.transaction();

  try {
    let updateData = { ...data };

    if (data.name) {
      updateData.subdomain = stringToSlug(data.name).toLowerCase();
      const exists = await getOrganizationBySubdomainExcludeId(updateData.subdomain, Number(organizationId));

      if (exists) {
        const error = new Error('Organization name already exists, please choose another one');
        (error as any).code = 'ORG_EXISTS';
        throw error;
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
    if (!(error as any).code) (error as any).code = 'ORG_UPDATE_ERROR';
    throw error;
  }
}

export async function removeOrganization(
  user: UserProfile,
  organizationId: number | string
): Promise<number> {
  checkOrganizationAccess(user, organizationId, 'You can only remove your own organizations');
  const trx = await database.transaction();

  try {
    const deleted = await deleteOrganization(Number(organizationId), trx);

    if (deleted && Array.isArray(user.organization_ids)) {
      const updatedIds = user.organization_ids.map(Number).filter(id => id !== Number(organizationId));
      let updateData: Partial<UserProfile> = { organization_ids: updatedIds };

      if (Number(user.current_organization_id) === Number(organizationId)) {
        updateData.current_organization_id = updatedIds.length > 0 ? updatedIds[0] : null;
      }

      await updateUser(Number(user.id), updateData, trx);
    }

    await trx.commit();

    return deleted;
  } catch (error) {
    await trx.rollback();
    logger.error('Error deleting organization:', error);
    if (!(error as any).code) (error as any).code = 'ORG_DELETE_ERROR';
    throw error;
  }
}

export async function getOrganizations(user: UserProfile): Promise<Organization[]> {
  if (!user.organization_ids || user.organization_ids.length === 0) return [];

  try {
    return await getOrganizationByIdsRepo(user.organization_ids);
  } catch (error) {
    logger.error('Error fetching organizations by ids:', error);
    (error as any).code = 'ORG_FETCH_ERROR';
    throw error;
  }
}

export async function getOrganizationById(
  id: number | string,
  user: UserProfile
): Promise<Organization | undefined> {
  checkOrganizationAccess(user, id, 'You can only access your own organizations');

  try {
    return await getOrganizationByIdRepo(Number(id));
  } catch (error) {
    logger.error('Error fetching organization by id:', error);
    (error as any).code = 'ORG_FETCH_ERROR';
    throw error;
  }
}

export async function organizationExistsByName(name: string): Promise<boolean> {
  try {
    const subdomain = stringToSlug(name).toLowerCase();
    const org = await getOrganizationBySubdomain(subdomain);

    return !!org;
  } catch (error) {
    logger.error('Error checking organization existence by name:', error);
    (error as any).code = 'ORG_EXISTS_CHECK_ERROR';
    throw error;
  }
}
