import database from '../config/database.config'
import { TABLES } from '../constants/database.constant'

const TABLE = TABLES.allowed_sites

export const siteColumns = {
  id: `${TABLE}.id`,
  user_id: `${TABLE}.user_id`,
  url: `${TABLE}.url`,
  createAt: `${TABLE}.created_at`,
  updatedAt: `${TABLE}.updated_at`,
  organizationId: `${TABLE}.organization_id`,
}

export type FindAllowedSitesProps = {
  id?: number
  user_id?: number
  url?: string
  createAt?: string
  updatedAt?: string
  organization_id?: number
}

export interface IUserSites extends FindAllowedSitesProps {
  expiredAt?: string | null | undefined
  trial?: number | null | undefined
}

export type allowedSites = {
  id?: number
  user_id?: number
  url?: string
  organization_id: number // Required for creation
}

export async function findSitesByUserId(id: number): Promise<IUserSites[]> {
  return database(TABLE).where({ [siteColumns.user_id]: id })
}

/**
 * Get sites with plan information for a user
 * @param userId - User ID
 * @param organizationId - Organization ID (required, filters by organization)
 * @returns Promise<IUserSites[]> - Sites with plan information
 */
export async function findUserSitesWithPlans(userId: number, organizationId: number): Promise<IUserSites[]> {
  // Get sites filtered by organization
  const query = database(TABLE).where(`${TABLE}.user_id`, userId).where(`${TABLE}.organization_id`, organizationId)

  // Get sites first, then join with latest plan info
  const sites = await query
    .leftJoin(TABLES.sitesPlans, function () {
      this.on(`${TABLES.sitesPlans}.allowed_site_id`, '=', `${TABLE}.id`).andOn(`${TABLES.sitesPlans}.id`, '=', database.raw(`(SELECT MAX(sp2.id) FROM ${TABLES.sitesPlans} sp2 WHERE sp2.allowed_site_id = ${TABLE}.id)`))
    })
    .select(
      `${TABLE}.id`,
      `${TABLE}.user_id`,
      `${TABLE}.url`,
      `${TABLE}.created_at as createAt`,
      `${TABLE}.updated_at as updatedAt`,
      `${TABLE}.organization_id`,
      `${TABLES.sitesPlans}.expired_at as expiredAt`,
      `${TABLES.sitesPlans}.is_trial as trial`,
      `${TABLE}.monitor_enabled`,
      `${TABLE}.status`,
      `${TABLE}.monitor_priority`,
      `${TABLE}.last_monitor_check`,
      `${TABLE}.is_currently_down`,
      `${TABLE}.monitor_consecutive_fails`,
    )
    .distinct()

  return sites
}

export async function findSiteById(id: number): Promise<FindAllowedSitesProps | undefined> {
  return database(TABLE).where({ id }).first()
}

export async function findSiteByURL(url: string): Promise<FindAllowedSitesProps> {
  const result = await database(TABLE)
    .select(`${TABLE}.id`, `${TABLE}.user_id`, `${TABLE}.url`, `${TABLE}.created_at as createAt`, `${TABLE}.updated_at as updatedAt`, `${TABLE}.organization_id`)
    .where({ [siteColumns.url]: url })
    .first()
  return result
}

export async function findSiteByUserIdAndSiteId(user_id: number, site_id: number): Promise<FindAllowedSitesProps> {
  return database(TABLE)
    .select(`${TABLE}.id`, `${TABLE}.user_id`, `${TABLE}.url`, `${TABLE}.created_at as createAt`, `${TABLE}.updated_at as updatedAt`, `${TABLE}.organization_id`)
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
        organization_id: data.organization_id,
        createAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      return insertedSite
    } catch (error) {
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
        trx(TABLES.impressions)
          .where('site_id', siteId)
          .del()
          .then((count) => console.log(`Deleted ${count} impressions`))
          .catch((err) => console.log(`Impressions deletion skipped: ${err.message}`)),
        trx(TABLES.problemReports)
          .where('site_id', siteId)
          .del()
          .then((count) => console.log(`Deleted ${count} problem_reports`))
          .catch((err) => console.log(`Problem reports deletion skipped: ${err.message}`)),
        trx(TABLES.visitors)
          .where('site_id', siteId)
          .del()
          .then((count) => console.log(`Deleted ${count} unique_visitors`))
          .catch((err) => console.log(`Unique visitors deletion skipped: ${err.message}`)),
        trx(TABLES.accessibilityReports)
          .where('allowed_sites_id', siteId)
          .del()
          .then((count) => console.log(`Deleted ${count} accessibility_reports`))
          .catch((err) => console.log(`Accessibility reports deletion skipped: ${err.message}`)),
        trx(TABLES.widgetSettings)
          .where('allowed_site_id', siteId)
          .del()
          .then((count) => console.log(`Deleted ${count} widget_settings`))
          .catch((err) => console.log(`Widget settings deletion skipped: ${err.message}`)),
        trx(TABLES.sitesPlans)
          .where('allowed_site_id', siteId)
          .del()
          .then((count) => console.log(`Deleted ${count} sites_plans`))
          .catch((err) => console.log(`Sites plans deletion skipped: ${err.message}`)),
      ])

      await trx.raw('SET FOREIGN_KEY_CHECKS = 1')

      // Delete the main site record within the same transaction
      const deletedCount = await trx(TABLE).where({ user_id, url }).del()

      return deletedCount
    } catch (error) {
      throw error
    }
  })
}

export async function updateAllowedSiteURL(site_id: number, url: string, user_id: number): Promise<number> {
  const urlExists = await database(TABLE)
    .select(siteColumns)
    .where({ [siteColumns.url]: url })
    .andWhereNot({ [siteColumns.id]: site_id })
    .first()

  if (urlExists) {
    throw new Error('The provided URL is already in use.')
  }

  return database(TABLE)
    .where({ [siteColumns.user_id]: user_id, [siteColumns.id]: site_id })
    .update({
      url,
    })
}

export async function toggleSiteMonitoring(site_id: number, enabled: boolean, user_id: number, organization_id?: number): Promise<boolean> {
  const whereClause: Record<string, number> = { id: site_id, user_id }

  if (organization_id) {
    whereClause.organization_id = organization_id
  }

  const updated = await database(TABLE).where(whereClause).update({ monitor_enabled: enabled })

  return updated > 0
}
