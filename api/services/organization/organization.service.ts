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
import { UserProfile } from '~/repository/user.repository';
import { stringToSlug, objectToString } from '~/helpers/string.helper';
import database from '~/config/database.config';
import {
  addUserToOrganization,
  getOrganizationsOfUser,
  getUserOrganization,
  isUserOwner
} from './organization_users.service';
import {
  ORGANIZATION_USER_ROLE_OWNER,
  ORGANIZATION_USER_STATUS_ACTIVE
} from '~/constants/database.constant';
import { updateUser } from '~/repository/user.repository';

export interface CreateOrganizationInput {
  name: string;
  logo_url?: string;
  settings?: any;
}

export async function addOrganization(data: CreateOrganizationInput, user: UserProfile & { isActive?: number }): Promise<number> {
  const orgLinks = await getOrganizationsOfUser(user.id);
  const maxOrgs = user.isActive ? 3 : 1;

  if (orgLinks.length >= maxOrgs) {
    const error = new Error(
      user.isActive
        ? 'You have reached the limit of organizations you can create (3 for verified users).'
        : 'Please verify your email to create more than one organization.'
    );

    (error as any).code = user.isActive ? 'ORG_LIMIT_VERIFIED' : 'ORG_LIMIT_UNVERIFIED';
    
    throw error;
  }

  const trx = await database.transaction();

  try {
    const subdomain = await stringToSlug(data.name);
    const exists = await getOrganizationBySubdomain(subdomain.toLowerCase());

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
    
    await addUserToOrganization(user.id, newOrgId, ORGANIZATION_USER_ROLE_OWNER, ORGANIZATION_USER_STATUS_ACTIVE, undefined, trx);
    await updateUser(user.id, { current_organization_id: newOrgId }, trx);
    
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
  await checkOrganizationAccess(
    user,
    organizationId,
    'You can only edit your own organizations'
  );

  const isOwner = await isUserOwner(user.id, Number(organizationId));

  if (!isOwner) {
    const error = new Error('Only owner can edit the organization');
    (error as any).code = 'ORG_EDIT_OWNER_ONLY';
    throw error;
  }

  const trx = await database.transaction();

  try {
    let updateData = { ...data };

    if (data.name) {
      updateData.subdomain = await stringToSlug(data.name);

      const exists = await getOrganizationBySubdomainExcludeId(
        updateData.subdomain.toLowerCase(),
        Number(organizationId)
      );

      if (exists) {
        const error = new Error('Organization name already exists, please choose another one');
        (error as any).code = 'ORG_EXISTS';
        throw error;
      }
    }

    if ('settings' in updateData) {
      updateData.settings = objectToString(updateData.settings);
    }

    const result = await updateOrganization(
      Number(organizationId),
      updateData,
      trx
    );
    
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
  console.log(user, organizationId)
  await checkOrganizationAccess(
    user,
    organizationId,
    'You can only remove your own organizations'
  );

  const isOwner = await isUserOwner(user.id, Number(organizationId));

  if (!isOwner) {
    const error = new Error('Only owner can remove the organization');
    (error as any).code = 'ORG_REMOVE_OWNER_ONLY';
    throw error;
  }

  const trx = await database.transaction();

  try {
    const deleted = await deleteOrganization(Number(organizationId), trx);

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
  try {
    const orgLinks = await getOrganizationsOfUser(user.id);
    const orgIds = orgLinks.map(link => link.organization_id);

    if (!orgIds.length) return [];

    return await getOrganizationByIdsRepo(orgIds);
  } catch (error) {
    logger.error('Error fetching organizations by user:', error);
    if (!(error as any).code) (error as any).code = 'ORG_FETCH_ERROR';

    throw error;
  }
}

export async function getOrganizationById(
  id: number | string,
  user: UserProfile
): Promise<Organization | undefined> {
  await checkOrganizationAccess(user, id, 'You can only access your own organizations');

  try {
    return await getOrganizationByIdRepo(Number(id));
  } catch (error) {
    logger.error('Error fetching organization by id:', error);
    if (!(error as any).code) (error as any).code = 'ORG_FETCH_ERROR';

    throw error;
  }
}

export async function organizationExistsByName(name: string): Promise<boolean> {
  try {
    const subdomain = await stringToSlug(name);
    const org = await getOrganizationBySubdomain(subdomain.toLowerCase());

    return !!org;
  } catch (error) {
    logger.error('Error checking organization existence by name:', error);
    if (!(error as any).code) (error as any).code = 'ORG_EXISTS_CHECK_ERROR';

    throw error;
  }
}

async function checkOrganizationAccess(user: UserProfile, organizationId: number | string, errorMessage: string) {
  try {
    const orgUser = await getUserOrganization(user.id, Number(organizationId));

    if (!orgUser) {
      const error = new Error(errorMessage);
      (error as any).code = 'ORG_ACCESS_DENIED';
      throw error;
    }
  } catch (error) {
    if (!(error as any).code) (error as any).code = 'ORG_ACCESS_CHECK_ERROR';
    throw error;
  }
}