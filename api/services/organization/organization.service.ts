import logger from '~/utils/logger';
import {
  createOrganization,
  updateOrganization,
  deleteOrganization,
  findOrganizationBySubdomain,
  findOrganizationBySubdomainExcludeId,
  getOrganizationBySubdomain,
  getOrganizationById as getOrganizationByIdRepo,
  Organization
} from '~/repository/organization.repository';
import { stringToSlug } from '~/helpers/string.helper';

export interface CreateOrganizationInput {
  name: string;
  logo_url?: string;
  settings?: any;
}

export async function addOrganization(orgData: CreateOrganizationInput): Promise<number[]> {
  try {
    const subdomain = stringToSlug(orgData.name).toLowerCase();
    const exists = await findOrganizationBySubdomain(subdomain);

    if (exists) {
      const error = new Error('Organization name already exists, please choose another one');
      (error as any).code = 'ORG_EXISTS';
      throw error;
    }

    return await createOrganization({ ...orgData, subdomain });
  } catch (error) {
    logger.error('Error creating organization:', error);

    throw error;
  }
}

export async function editOrganization(id: number, data: Partial<Organization>): Promise<number> {
  try {
    let updateData = { ...data };
    
    if (data.name) {
      updateData.subdomain = stringToSlug(data.name).toLowerCase();
      const exists = await findOrganizationBySubdomainExcludeId(updateData.subdomain, id);

      if (exists) {
        const error = new Error('Organization name already exists, please choose another one');
        (error as any).code = 'ORG_EXISTS';

        throw error;
      }
    }
    
    return await updateOrganization(id, updateData);
  } catch (error) {
    logger.error('Error updating organization:', error);

    throw error;
  }
}

export async function removeOrganization(id: number): Promise<number> {
  try {
    return await deleteOrganization(id);
  } catch (error) {
    logger.error('Error deleting organization:', error);

    throw error;
  }
}

export async function getOrganization(subdomain: string): Promise<Organization | undefined> {
  try {
    return await getOrganizationBySubdomain(subdomain);
  } catch (error) {
    logger.error('Error fetching organization by subdomain:', error);
    throw error;
  }
}

export async function getOrganizationById(id: number): Promise<Organization | undefined> {
  try {
    return await getOrganizationByIdRepo(id);
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
