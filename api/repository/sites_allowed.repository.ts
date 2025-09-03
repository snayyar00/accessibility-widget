import database from '../config/database.config'
import { TABLES } from '../constants/database.constant'

const TABLE = TABLES.allowed_sites

export const siteColumns = {
  id: 'allowed_sites.id',
  user_id: 'allowed_sites.user_id',
  url: 'allowed_sites.url',
  createAt: 'allowed_sites.created_at',
  updatedAt: 'allowed_sites.updated_at',
}

export type FindAllowedSitesProps = {
  id?: number
  user_id?: number
  url?: string
  createAt?: string
  updatedAt?: string
}

export interface IUserSites extends FindAllowedSitesProps {
  expiredAt?: string | null | undefined
  trial?: number | null | undefined
}

export type allowedSites = {
  id?: number
  user_id?: number
  url?: string
}

export async function findSitesByUserId(id: number): Promise<IUserSites[]> {
  return database(TABLE).where({ [siteColumns.user_id]: id })
}

/**
 * Find user sites with workspace support and site plans in a single optimized query
 * @param userId - User ID
 * @param organizationId - Organization ID (optional)
 * @param currentWorkspaceId - Current workspace ID (optional)
 * @returns Promise<IUserSites[]> - Sites with plan information
 */
export async function findUserSitesWithPlans(userId: number, organizationId?: number, currentWorkspaceId?: number | null): Promise<IUserSites[]> {
  let query = database(TABLE)

  if (organizationId && currentWorkspaceId) {
    // User is in a workspace - get workspace sites
    query = query.join('workspace_allowed_sites', 'workspace_allowed_sites.allowed_site_id', 'allowed_sites.id').where('workspace_allowed_sites.workspace_id', currentWorkspaceId)
  } else {
    // User is not in workspace - get personal sites
    query = query.where('allowed_sites.user_id', userId)
  }

  // Get sites first, then join with latest plan info
  const sites = await query
    .leftJoin('sites_plans', function () {
      this.on('sites_plans.allowed_site_id', '=', 'allowed_sites.id').andOn('sites_plans.id', '=', database.raw('(SELECT MAX(sp2.id) FROM sites_plans sp2 WHERE sp2.allowed_site_id = allowed_sites.id)'))
    })
    .select(
      'allowed_sites.id', 
      'allowed_sites.user_id', 
      'allowed_sites.url', 
      'allowed_sites.created_at as createAt', 
      'allowed_sites.updated_at as updatedAt', 
      'sites_plans.expired_at as expiredAt', 
      'sites_plans.is_trial as trial',
      'allowed_sites.monitor_enabled',
      'allowed_sites.status',
      'allowed_sites.monitor_priority',
      'allowed_sites.last_monitor_check',
      'allowed_sites.is_currently_down',
      'allowed_sites.monitor_consecutive_fails'
    )
    .distinct()

  return sites
}

export async function findSiteById(id: number): Promise<any> {
  return database(TABLE)
    .where({ id })
    .first()
}

export async function findSiteByURL(url: string): Promise<FindAllowedSitesProps> {
  const result = await database(TABLE)
    .select(siteColumns)
    .where({ [siteColumns.url]: url })
    .first()
  return result
}

export async function findSiteByUserIdAndSiteId(user_id: number, site_id: number): Promise<FindAllowedSitesProps> {
  return database(TABLE)
    .select(siteColumns)
    .where({ [siteColumns.user_id]: user_id, [siteColumns.id]: site_id })
    .first()
}

export async function insertSite(data: allowedSites): Promise<FindAllowedSitesProps | string> {
  const startTime = Date.now()

  return database.transaction(async (trx) => {
    try {
      const existing = await trx(TABLE).select('id').where({ url: data.url }).forUpdate().first()

      if (existing) {
        console.log(`insertSite (duplicate) took: ${Date.now() - startTime}ms`)
        return 'You have already added this site.'
      }
      const site_id = await trx(TABLE).insert(data)

      if (!site_id || site_id.length === 0) {
        throw new Error('Failed to insert site - no ID returned')
      }

      const insertedSite: FindAllowedSitesProps = {
        id: site_id[0],
        user_id: data.user_id,
        url: data.url,
        createAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      return insertedSite
    } catch (error) {
      console.error('insertSite transaction error:', error)
      return `insert failed: ${error.message}`
    }
  })
}

export async function deleteSiteByURL(url: string, user_id: number): Promise<number> {
  return database(TABLE).where({ user_id, url }).del()
}

/**
 * Safely deletes a site and all its related records to avoid foreign key constraint violations
 * Uses a transaction to ensure atomicity - either all records are deleted or none are
 */
export async function deleteSiteWithRelatedRecords(url: string, user_id: number): Promise<number> {
  return database.transaction(async (trx) => {
    try {
      // Find the site within the transaction
      const site = await trx(TABLE)
        .select(siteColumns)
        .where({ [siteColumns.url]: url, [siteColumns.user_id]: user_id })
        .first()

      if (!site) {
        throw new Error(`Site not found: ${url} for user ${user_id}`)
      }

      const siteId = site.id

      // Delete all related records within the same transaction
      await trx.raw('SET FOREIGN_KEY_CHECKS = 0')

      await Promise.all([
        trx('impressions')
          .where('site_id', siteId)
          .del()
          .then((count) => console.log(`Deleted ${count} impressions`))
          .catch((err) => console.log(`Impressions deletion skipped: ${err.message}`)),
        trx('problem_reports')
          .where('site_id', siteId)
          .del()
          .then((count) => console.log(`Deleted ${count} problem_reports`))
          .catch((err) => console.log(`Problem reports deletion skipped: ${err.message}`)),
        trx('unique_visitors')
          .where('site_id', siteId)
          .del()
          .then((count) => console.log(`Deleted ${count} unique_visitors`))
          .catch((err) => console.log(`Unique visitors deletion skipped: ${err.message}`)),
        trx('accessibility_reports')
          .where('allowed_sites_id', siteId)
          .del()
          .then((count) => console.log(`Deleted ${count} accessibility_reports`))
          .catch((err) => console.log(`Accessibility reports deletion skipped: ${err.message}`)),
        trx('widget_settings')
          .where('allowed_site_id', siteId)
          .del()
          .then((count) => console.log(`Deleted ${count} widget_settings`))
          .catch((err) => console.log(`Widget settings deletion skipped: ${err.message}`)),
        trx('sites_plans')
          .where('allowed_site_id', siteId)
          .del()
          .then((count) => console.log(`Deleted ${count} sites_plans`))
          .catch((err) => console.log(`Sites plans deletion skipped: ${err.message}`)),
        trx('site_permissions')
          .where('allowed_site_id', siteId)
          .del()
          .then((count) => console.log(`Deleted ${count} site_permissions`))
          .catch((err) => console.log(`Site permissions deletion skipped: ${err.message}`)),
      ])

      await trx.raw('SET FOREIGN_KEY_CHECKS = 1')

      // Delete the main site record within the same transaction
      const deletedCount = await trx(TABLE).where({ user_id, url }).del()

      console.log(`Deleted site: ${url} (${deletedCount} records)`)
      return deletedCount
    } catch (error) {
      console.error('Error in deleteSiteWithRelatedRecords for %s:', url, error)
      throw error
    }
  })
}

export async function updateAllowedSiteURL(site_id: number, url: string, user_id: number): Promise<number> {
  const urlExists = await database(TABLE).select(siteColumns).where({ 'allowed_sites.url': url }).andWhereNot({ 'allowed_sites.id': site_id }).first()

  if (urlExists) {
    throw new Error('The provided URL is already in use.')
  }

  return database(TABLE).where({ 'allowed_sites.user_id': user_id, 'allowed_sites.id': site_id }).update({
    url,
  })
}
