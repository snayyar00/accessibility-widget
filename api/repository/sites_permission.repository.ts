import { Knex } from 'knex'

import database from '../config/database.config'
import { TABLES } from '../constants/database.constant'
import formatDateDB from '../utils/format-date-db'

const TABLE = TABLES.sitePermissions

export type SitePermission = {
  id?: number
  allowed_site_id?: number
  permission?: string
  sites_plan_id?: number
  created_at?: string
  updated_at?: string
  deleted_at?: string
}

export const sitePermissionColumns = {
  id: 'sites_permissions.id',
  siteId: 'sites_permissions.allowed_site_id',
  sitePlanId: 'sites_permissions.sites_plan_id',
  permission: 'sites_permissions.permission',
  createAt: 'sites_permissions.created_at',
  updatedAt: 'sites_permissions.updated_at',
  deletedAt: 'sites_permissions.deleted_at',
}

export async function insertMultiSitePermission(data: SitePermission[], transaction: Knex.Transaction = null): Promise<number[]> {
  const query = database(TABLE).insert(data)
  if (!transaction) {
    return query
  }
  return query.transacting(transaction)
}

export function deletePermissionBySitePlanId(sitePlanId: number, dateDeleted: string = null): Promise<number> {
  const deleteAt = dateDeleted || formatDateDB()
  return database(TABLE)
    .where({ [sitePermissionColumns.sitePlanId]: sitePlanId })
    .update({ deleted_at: deleteAt })
}
