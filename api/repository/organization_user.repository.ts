import { Knex } from 'knex'

import database from '../config/database.config'
import { TABLES } from '../constants/database.constant'
import { OrganizationUserRole, OrganizationUserStatus } from '../constants/organization.constant'
import { logger } from '../utils/logger'
import { Organization } from './organization.repository'
import { UserProfile } from './user.repository'

const TABLE = TABLES.organization_users

export type OrganizationUser = {
  id?: number
  user_id: number
  organization_id: number
  role?: OrganizationUserRole
  status?: OrganizationUserStatus
  created_at?: string
  updated_at?: string
}

export type OrganizationUserWithUserInfo = OrganizationUser & {
  organizations: Organization[]
  user: UserProfile
  currentOrganization: Organization
}

export async function insertOrganizationUser(data: OrganizationUser, trx?: Knex.Transaction): Promise<number[]> {
  const query = database(TABLE).insert(data)

  if (!trx) {
    return query
  }

  return query.transacting(trx)
}

export async function getOrganizationUser(user_id: number, organization_id: number): Promise<OrganizationUser | undefined> {
  return database(TABLE).where({ user_id, organization_id }).first()
}

export async function getOrganizationUsersByUserId(user_id: number): Promise<OrganizationUser[]> {
  return database(TABLE).where({ user_id })
}

export async function getOrganizationUsersByOrganizationId(organization_id: number): Promise<OrganizationUser[]> {
  return database(TABLE).where({ organization_id })
}

export async function updateOrganizationUser(id: number, data: Partial<OrganizationUser>, trx?: Knex.Transaction): Promise<number> {
  const query = database(TABLE).where({ id }).update(data)

  if (!trx) {
    return query
  }

  return query.transacting(trx)
}

export async function deleteOrganizationUser(id: number, trx?: Knex.Transaction): Promise<number> {
  const query = database(TABLE).where({ id }).del()

  if (!trx) {
    return query
  }

  return query.transacting(trx)
}

type OrganizationByUser = {
  user_id: number
  org_id: number
  org_name: string
  org_domain: string
}

function getOrganizationsByUserIds(userIds: number[]): Promise<OrganizationByUser[]> {
  return database(TABLE)
    .whereIn('user_id', userIds)
    .join('organizations', `${TABLE}.organization_id`, 'organizations.id')
    .select([`${TABLE}.user_id`, 'organizations.id as org_id', 'organizations.name as org_name', 'organizations.domain as org_domain'])
}

export async function getOrganizationUsersWithUserInfo(organization_id: number): Promise<OrganizationUserWithUserInfo[]> {
  try {
    const rows = await database(TABLE)
      .where({ organization_id })
      .join('users', `${TABLE}.user_id`, 'users.id')
      .leftJoin('organizations', 'users.current_organization_id', 'organizations.id')
      .select([`${TABLE}.*`, 'users.id as user_id', 'users.email', 'users.name', 'users.current_organization_id', 'users.is_active', 'organizations.id as org_id', 'organizations.name as org_name', 'organizations.domain as org_domain'])
      .orderBy(`${TABLE}.updated_at`, 'desc')

    if (!rows || !rows.length) {
      return []
    }

    const userIds = rows.map((r) => r.user_id)
    const userOrgs = await getOrganizationsByUserIds(userIds)

    const orgsByUser: Record<number, Organization[]> = {}

    userOrgs.forEach((uo) => {
      if (!orgsByUser[uo.user_id]) orgsByUser[uo.user_id] = []

      orgsByUser[uo.user_id].push({
        id: uo.org_id,
        name: uo.org_name,
        domain: uo.org_domain,
      } as Organization)
    })

    return rows.map((row) => {
      const { id, user_id, organization_id, role, status, created_at, updated_at, email, name, current_organization_id, is_active, org_id, org_name, org_domain } = row

      return {
        id,
        user_id,
        organization_id,
        role,
        status,
        created_at,
        updated_at,
        organizations: orgsByUser[user_id] || [],
        user: {
          id: user_id,
          email,
          name,
          current_organization_id,
          isActive: is_active,
        },
        currentOrganization: org_id
          ? {
              id: org_id,
              name: org_name,
              domain: org_domain,
            }
          : null,
      }
    })
  } catch (error) {
    logger.error('getOrganizationUsersWithUserInfo error', error)
    return []
  }
}
