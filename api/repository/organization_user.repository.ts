import { Knex } from 'knex'

import database from '../config/database.config'
import { TABLES } from '../constants/database.constant'
import { OrganizationUserRole, OrganizationUserStatus } from '../constants/organization.constant'
import { logger } from '../utils/logger'
import { Organization } from './organization.repository'
import { UserProfile } from './user.repository'
import { Workspace } from './workspace.repository'

const TABLE = TABLES.organization_users

export type OrganizationUser = {
  id?: number
  user_id: number
  organization_id: number
  role?: OrganizationUserRole
  status?: OrganizationUserStatus
  created_at?: string
  updated_at?: string
  current_workspace_id?: number | null
}

export type OrganizationUserWithUserInfo = OrganizationUser & {
  organizations: Organization[]
  user: UserProfile
  currentOrganization: Organization
  workspaces: Workspace[]
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

export async function updateOrganizationUserByOrganizationAndUserId(organization_id: number, user_id: number, data: Partial<OrganizationUser>, trx?: Knex.Transaction): Promise<number> {
  const query = database(TABLE).where({ organization_id, user_id }).update(data)

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

type WorkspaceByUser = {
  user_id: number
  workspace_id: number
  workspace_name: string
  workspace_alias: string
}

function getOrganizationWorkspacesByUserIds(userIds: number[], organization_id: number): Promise<WorkspaceByUser[]> {
  return database('workspace_users')
    .whereIn('user_id', userIds)
    .where('workspace_users.status', 'active')
    .join('workspaces', 'workspace_users.workspace_id', 'workspaces.id')
    .where('workspaces.organization_id', organization_id)
    .select(['workspace_users.user_id', 'workspaces.id as workspace_id', 'workspaces.name as workspace_name', 'workspaces.alias as workspace_alias'])
}

export async function getOrganizationUsersWithUserInfo(organization_id: number): Promise<OrganizationUserWithUserInfo[]> {
  try {
    const rows = await database(TABLE)
      .where({ organization_id })
      .join('users', `${TABLE}.user_id`, 'users.id')
      .leftJoin('organizations', 'users.current_organization_id', 'organizations.id')
      .select([`${TABLE}.*`, 'users.id as user_id', 'users.email', 'users.name', 'users.current_organization_id', 'users.is_active', 'organizations.id as org_id', 'organizations.name as org_name', 'organizations.domain as org_domain'])
      .orderBy(`${TABLE}.updated_at`, 'desc')

    if (!rows?.length) return []

    const userIds = rows.map((r) => r.user_id)
    const userOrgs = await getOrganizationsByUserIds(userIds)
    const userWorkspaces = await getOrganizationWorkspacesByUserIds(userIds, organization_id)

    const orgsByUser = userOrgs.reduce(
      (acc, uo) => {
        if (!acc[uo.user_id]) acc[uo.user_id] = []

        acc[uo.user_id].push({ id: uo.org_id, name: uo.org_name, domain: uo.org_domain } as Organization)

        return acc
      },
      {} as Record<number, Organization[]>,
    )

    const workspacesByUser = userWorkspaces.reduce(
      (acc, uw) => {
        if (!acc[uw.user_id]) acc[uw.user_id] = []

        acc[uw.user_id].push({
          id: uw.workspace_id,
          name: uw.workspace_name,
          alias: uw.workspace_alias,
        } as Workspace)

        return acc
      },
      {} as Record<number, Workspace[]>,
    )

    return rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      organization_id: row.organization_id,
      role: row.role,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      current_workspace_id: row.current_workspace_id,
      organizations: orgsByUser[row.user_id] || [],
      workspaces: workspacesByUser[row.user_id] || [],
      user: {
        id: row.user_id,
        email: row.email,
        name: row.name,
        current_organization_id: row.current_organization_id,
        isActive: row.is_active,
      },
      currentOrganization: row.org_id
        ? {
            id: row.org_id,
            name: row.org_name,
            domain: row.org_domain,
          }
        : null,
    }))
  } catch (error) {
    logger.error('getOrganizationUsersWithUserInfo error', error)
    return []
  }
}
