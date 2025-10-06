import { Knex } from 'knex'

import database from '../config/database.config'
import { TABLES } from '../constants/database.constant'
import { siteColumns } from './sites_allowed.repository'

const TABLE = TABLES.workspace_allowed_sites

export const workspaceColumns = {
  id: `${TABLES.workspaces}.id`,
  name: `${TABLES.workspaces}.name`,
  alias: `${TABLES.workspaces}.alias`,
}

export const userColumns = {
  id: `${TABLES.users}.id`,
  name: `${TABLES.users}.name`,
  email: `${TABLES.users}.email`,
}

export type WorkspaceAllowedSite = {
  id?: number
  workspace_id?: number
  allowed_site_id?: number
  added_by_user_id?: number
  site_owner_user_id?: number
  created_at?: string
  updated_at?: string
}

export type WorkspaceWithDomains = {
  workspace_id: number
  workspace_name: string
  workspace_alias: string
  allowed_site_id: number
  allowed_site_url: string
  added_by_user_id: number
  added_by_user_name: string
  added_by_user_email: string
  site_owner_user_id: number
  site_owner_user_name: string
  site_owner_user_email: string
  created_at: string
}

export const workspaceAllowedSitesColumns = {
  id: `${TABLE}.id`,
  workspaceId: `${TABLE}.workspace_id`,
  allowedSiteId: `${TABLE}.allowed_site_id`,
  addedByUserId: `${TABLE}.added_by_user_id`,
  siteOwnerUserId: `${TABLE}.site_owner_user_id`,
  createdAt: `${TABLE}.created_at`,
  updatedAt: `${TABLE}.updated_at`,
}

/**
 * Get all domains for a workspace
 * @param workspaceId - ID of workspace
 * @returns array of allowed sites (domains) for the workspace with user information
 */
export async function getWorkspaceDomains(workspaceId: number): Promise<WorkspaceWithDomains[]> {
  return database(TABLE)
    .join(TABLES.allowed_sites, workspaceAllowedSitesColumns.allowedSiteId, siteColumns.id)
    .join(TABLES.workspaces, workspaceAllowedSitesColumns.workspaceId, workspaceColumns.id)
    .join(`${TABLES.users} as added_by`, workspaceAllowedSitesColumns.addedByUserId, 'added_by.id')
    .join(`${TABLES.users} as site_owner`, workspaceAllowedSitesColumns.siteOwnerUserId, 'site_owner.id')
    .where(workspaceAllowedSitesColumns.workspaceId, workspaceId)
    .select({
      workspace_id: workspaceAllowedSitesColumns.workspaceId,
      workspace_name: workspaceColumns.name,
      workspace_alias: workspaceColumns.alias,
      allowed_site_id: workspaceAllowedSitesColumns.allowedSiteId,
      allowed_site_url: siteColumns.url,
      added_by_user_id: workspaceAllowedSitesColumns.addedByUserId,
      added_by_user_name: 'added_by.name',
      added_by_user_email: 'added_by.email',
      site_owner_user_id: workspaceAllowedSitesColumns.siteOwnerUserId,
      site_owner_user_name: 'site_owner.name',
      site_owner_user_email: 'site_owner.email',
      created_at: workspaceAllowedSitesColumns.createdAt,
    })
}

/**
 * Set domains for workspace (replaces all existing domains)
 * @param workspaceId - ID of workspace
 * @param allowedSiteIds - array of allowed site IDs
 * @param addedByUserId - ID of user who is adding the domains
 * @param transaction - optional transaction
 * @returns true if successful
 */
export async function setWorkspaceDomains(workspaceId: number, allowedSiteIds: number[], addedByUserId: number, transaction: Knex.Transaction = null): Promise<boolean> {
  const trx = transaction || (await database.transaction())

  try {
    // Remove all existing domains for this workspace
    await database(TABLE).where({ workspace_id: workspaceId }).del().transacting(trx)

    // Add new domains if any
    if (allowedSiteIds.length > 0) {
      // Get site owners information from allowed_sites table
      const siteOwners = await database(TABLES.allowed_sites).whereIn('id', allowedSiteIds).select('id', 'user_id').transacting(trx)

      const domainsData = allowedSiteIds.map((allowedSiteId) => {
        const siteOwner = siteOwners.find((s) => s.id === allowedSiteId)
        return {
          workspace_id: workspaceId,
          allowed_site_id: allowedSiteId,
          added_by_user_id: addedByUserId,
          site_owner_user_id: siteOwner?.user_id || addedByUserId, // fallback to addedByUserId if owner not found
        }
      })

      await database(TABLE).insert(domainsData).transacting(trx)
    }

    if (!transaction) {
      await trx.commit()
    }

    return true
  } catch (error) {
    if (!transaction) {
      await trx.rollback()
    }
    throw error
  }
}
