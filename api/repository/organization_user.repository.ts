import Knex from 'knex';
import database from '~/config/database.config';
import { TABLES } from '~/constants/database.constant';
import { OrganizationUserRole, OrganizationUserStatus } from '~/constants/organization.constant';

export type OrganizationUser = {
  id?: number;
  user_id: number;
  organization_id: number;
  role?: OrganizationUserRole;
  status?: OrganizationUserStatus;
  created_at?: string;
  updated_at?: string;
};

const TABLE = TABLES.organization_users;

export async function insertOrganizationUser(data: OrganizationUser, trx?: Knex.Transaction): Promise<number[]> {
  const query = database(TABLE).insert(data);

  if (!trx) {
    return query;
  }

  return query.transacting(trx);
}

export async function getOrganizationUser(user_id: number, organization_id: number): Promise<OrganizationUser | undefined> {
  return database(TABLE).where({ user_id, organization_id }).first();
}

export async function getOrganizationUsersByUserId(user_id: number): Promise<OrganizationUser[]> {
  return database(TABLE).where({ user_id });
}

export async function getOrganizationUsersByOrganizationId(organization_id: number): Promise<OrganizationUser[]> {
  return database(TABLE).where({ organization_id });
}

export async function updateOrganizationUser(id: number, data: Partial<OrganizationUser>, trx?: Knex.Transaction): Promise<number> {
  const query = database(TABLE).where({ id }).update(data);

  if (!trx) {
    return query;
  }

  return query.transacting(trx);
}

export async function deleteOrganizationUser(id: number, trx?: Knex.Transaction): Promise<number> {
  const query = database(TABLE).where({ id }).del();

  if (!trx) {
    return query;
  }

  return query.transacting(trx);
}
