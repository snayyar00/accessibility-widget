import logger from '~/utils/logger';
import {
  createOrganization,
  updateOrganization,
  deleteOrganization,
  getOrganizationBySubdomainExcludeId,
  getOrganizationBySubdomain,
  getOrganizationById as getOrganizationByIdRepo,
  Organization
} from '~/repository/organization.repository';
import { updateUser, UserProfile } from '~/repository/user.repository';
import { stringToSlug, objectToString } from '~/helpers/string.helper';

export interface CreateOrganizationInput {
  name: string;
  logo_url?: string;
  settings?: any;
}

function checkOrganizationAccess(user: UserProfile, id: number | string, errorMessage: string) {
  const numId = Number(id);
  
  if (!user.organization_ids || !user.organization_ids.map(Number).includes(numId)) {
    throw new Error(errorMessage);
  }
}

export async function addOrganization(data: CreateOrganizationInput, user: UserProfile): Promise<number[]> {
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

    const ids = await createOrganization(orgToCreate);
    const newOrgId = Number(ids[0]);
    
    const updatedIds = Array.isArray(user.organization_ids)
      ? [...user.organization_ids.map(Number), newOrgId]
      : [newOrgId];

    await updateUser(Number(user.id), { organization_ids: updatedIds });

    return ids;
  } catch (error) {
    logger.error('Error creating organization:', error);
    throw error;
  }
}

export async function editOrganization(data: Partial<Organization>, user: UserProfile, organizationId: number | string): Promise<number> {
  checkOrganizationAccess(user, organizationId, 'You can only edit your own organizations');

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

    return await updateOrganization(Number(organizationId), updateData);
  } catch (error) {
    logger.error('Error updating organization:', error);
    throw error;
  }
}

export async function removeOrganization(user: UserProfile, organizationId: number | string): Promise<number> {
  checkOrganizationAccess(user, organizationId, 'You can only remove your own organizations');

  try {
    const deleted = await deleteOrganization(Number(organizationId));

    if (deleted && Array.isArray(user.organization_ids)) {
      const updatedIds = user.organization_ids.map(Number).filter(id => id !== Number(organizationId));
      
      await updateUser(Number(user.id), { organization_ids: updatedIds });
    }

    return deleted;
  } catch (error) {
    logger.error('Error deleting organization:', error);
    throw error;
  }
}

export async function getOrganizationById(id: number | string, user: UserProfile): Promise<Organization | undefined> {
  checkOrganizationAccess(user, id, 'You can only access your own organizations');
  
  try {
    return await getOrganizationByIdRepo(Number(id));
  } catch (error) {
    logger.error('Error fetching organization by id:', error);
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
    throw error;
  }
}
