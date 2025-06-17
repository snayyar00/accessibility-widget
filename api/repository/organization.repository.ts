import database from '~/config/database.config';
import { TABLES } from '~/constants/database.constant';

const TABLE = TABLES.organizations;

export type Organization = {
  id?: number;
  name: string;
  subdomain: string;
  logo_url?: string;
  settings?: object;
  created_at?: string;
  updated_at?: string;
};

export async function createOrganization(orgData: Organization): Promise<number[]> {
  return database(TABLE).insert(orgData);
}

export async function updateOrganization(id: number, data: Partial<Organization>): Promise<number> {
  return database(TABLE).where({ id }).update(data);
}

export async function deleteOrganization(id: number): Promise<number> {
  return database(TABLE).where({ id }).del();
}

export async function getOrganizationBySubdomain(subdomain: string): Promise<Organization | undefined> {
  return database(TABLE).where({ subdomain }).first();
}

export async function getOrganizationById(id: number): Promise<Organization | undefined> {
  return database(TABLE).where({ id }).first();
}

export async function findOrganizationBySubdomain(subdomain: string): Promise<Organization | undefined> {
  return database(TABLE).where({ subdomain }).first();
}

export async function findOrganizationBySubdomainExcludeId(subdomain: string, id: number): Promise<Organization | undefined> {
  return database(TABLE).where({ subdomain }).andWhereNot({ id }).first();
}
