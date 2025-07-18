import database from '~/config/database.config';
import { TABLES } from '~/constants/database.constant';
import Knex from 'knex';

const TABLE = TABLES.organizations;

export type Organization = {
  id?: number;
  name: string;
  domain: string;
  logo_url?: string;
  settings?: string | object;
  created_at?: string;
  updated_at?: string;
};

export async function createOrganization(orgData: Organization, trx?: Knex.Transaction): Promise<number[]> {
  const query = database(TABLE).insert(orgData);

  return trx ? query.transacting(trx) : query;
}

export async function updateOrganization(id: number, data: Partial<Organization>, trx?: Knex.Transaction): Promise<number> {
  const query = database(TABLE).where({ id }).update(data);

  return trx ? query.transacting(trx) : query;
}

export async function deleteOrganization(id: number, trx?: Knex.Transaction): Promise<number> {
  const query = database(TABLE).where({ id }).del();

  return trx ? query.transacting(trx) : query;
}

export async function getOrganizationByDomain(domain: string): Promise<Organization | undefined> {
  return database(TABLE).where({ domain }).first();
}

export async function getOrganizationById(id: number): Promise<Organization | undefined> {
  return database(TABLE).where({ id }).first();
}

export async function getOrganizationByDomainExcludeId(domain: string, id: number): Promise<Organization | undefined> {
  return database(TABLE).where({ domain }).andWhereNot({ id }).first();
}

export async function getOrganizationsByIds(ids: number[]): Promise<Organization[]> {
  if (!ids.length) return [];

  return database(TABLE).whereIn('id', ids).select();
}
