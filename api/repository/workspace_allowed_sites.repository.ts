import { Knex } from 'knex'

import database from '../config/database.config'
import { TABLES } from '../constants/database.constant'

const TABLE = TABLES.workspace_allowed_sites

export type WorkspaceAllowedSite = {
  id?: number
  workspace_id?: number
  allowed_site_id?: number
}

export type WorkspaceWithDomains = {
  workspace_id: number
  workspace_name: string
  workspace_alias: string
  allowed_site_id: number
  allowed_site_url: string
}

export const workspaceAllowedSitesColumns = {
  id: 'workspace_allowed_sites.id',
  workspaceId: 'workspace_allowed_sites.workspace_id',
  allowedSiteId: 'workspace_allowed_sites.allowed_site_id',
}

/**
 * Get all domains for a workspace
 * @param workspaceId - ID of workspace
 * @returns array of allowed sites (domains) for the workspace
 */
export async function getWorkspaceDomains(workspaceId: number): Promise<WorkspaceWithDomains[]> {
  return database(TABLE).join(TABLES.allowed_sites, workspaceAllowedSitesColumns.allowedSiteId, 'allowed_sites.id').join(TABLES.workspaces, workspaceAllowedSitesColumns.workspaceId, 'workspaces.id').where(workspaceAllowedSitesColumns.workspaceId, workspaceId).select({
    workspace_id: workspaceAllowedSitesColumns.workspaceId,
    workspace_name: 'workspaces.name',
    workspace_alias: 'workspaces.alias',
    allowed_site_id: workspaceAllowedSitesColumns.allowedSiteId,
    allowed_site_url: 'allowed_sites.url',
  })
}

/**
 * Set domains for workspace (replaces all existing domains)
 * @param workspaceId - ID of workspace
 * @param allowedSiteIds - array of allowed site IDs
 * @param transaction - optional transaction
 * @returns true if successful
 */
export async function setWorkspaceDomains(workspaceId: number, allowedSiteIds: number[], transaction: Knex.Transaction = null): Promise<boolean> {
  const trx = transaction || (await database.transaction())

  try {
    // Remove all existing domains for this workspace
    await database(TABLE).where({ workspace_id: workspaceId }).del().transacting(trx)

    // Add new domains if any
    if (allowedSiteIds.length > 0) {
      const domainsData = allowedSiteIds.map((allowedSiteId) => ({
        workspace_id: workspaceId,
        allowed_site_id: allowedSiteId,
      }))

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
