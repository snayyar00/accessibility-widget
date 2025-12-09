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
  is_owner?: boolean // true if current user is the owner of this site
  workspaces?: Array<{ id: number; name: string }> // Array of all workspaces this site belongs to
  user_email?: string // Email of the site owner
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

export async function findSiteById(id: number): Promise<FindAllowedSitesProps | undefined> {
  return database(TABLE).where({ id }).first()
}

/**
 * Get sites by array of IDs
 * @param ids - Array of site IDs
 * @returns Array of sites with id, organization_id, and user_id
 */
export async function findSitesByIds(ids: number[]): Promise<Array<{ id: number; organization_id: number; user_id: number }>> {
  if (ids.length === 0) return []
  return database(TABLE).whereIn('id', ids).select('id', 'organization_id', 'user_id')
}

/**
 * Get total count of sites for a user/organization with optional filter
 */
export async function findUserSitesCount(userId: number, organizationId: number, isAdmin: boolean, filter?: 'all' | 'active' | 'disabled'): Promise<number> {
  let filterCondition = '';
  const params: any[] = [];
  
  if (filter === 'active' || filter === 'disabled') {
    const latestPlanSubquery = `(SELECT MAX(sp2.id) FROM ${TABLES.sitesPlans} sp2 WHERE sp2.allowed_site_id = ${TABLE}.id)`;
    
    if (filter === 'active') {
      // Active: trial === 0 AND expiredAt > now
      filterCondition = `
        AND EXISTS (
          SELECT 1 FROM ${TABLES.sitesPlans} sp_count
          WHERE sp_count.allowed_site_id = ${TABLE}.id
          AND sp_count.is_trial = 0
          AND sp_count.expired_at IS NOT NULL
          AND sp_count.expired_at > NOW()
          AND sp_count.id = ${latestPlanSubquery}
        )
      `;
    } else { // filter === 'disabled'
      // Disabled: trial === 1 OR expiredAt is null OR expiredAt <= now
      filterCondition = `
        AND EXISTS (
          SELECT 1 FROM ${TABLES.sitesPlans} sp_count
          WHERE sp_count.allowed_site_id = ${TABLE}.id
          AND (sp_count.is_trial = 1 OR sp_count.expired_at IS NULL OR sp_count.expired_at <= NOW())
          AND sp_count.id = ${latestPlanSubquery}
        )
      `;
    }
  }
  
  if (isAdmin) {
    const result = await database.raw(
      `
      SELECT COUNT(*) as count
      FROM ${TABLE}
      WHERE ${TABLE}.organization_id = ?${filterCondition}
      `,
      [organizationId, ...params],
    );
    return Number(result[0]?.[0]?.count || 0);
  } else {
    const result = await database.raw(
      `
      SELECT COUNT(DISTINCT ${TABLE}.id) as count
      FROM ${TABLE}
      WHERE ${TABLE}.organization_id = ?
        AND (
          ${TABLE}.user_id = ?
          OR EXISTS (
            SELECT 1
            FROM ${TABLES.workspace_allowed_sites} was2
            JOIN ${TABLES.workspaces} w2 ON was2.workspace_id = w2.id
            JOIN ${TABLES.workspace_users} wu ON w2.id = wu.workspace_id
            WHERE was2.allowed_site_id = ${TABLE}.id
              AND wu.user_id = ?
              AND wu.status = 'active'
          )
        )${filterCondition}
      `,
      [organizationId, userId, userId, ...params],
    );
    return Number(result[0]?.[0]?.count || 0);
  }
}

/**
 * For admins: Returns ALL organization sites with workspace data aggregated via LEFT JOIN
 * For regular users: Returns own sites + workspace sites (with active membership check) in single query
 *
 * @param userId - User ID
 * @param organizationId - Organization ID
 * @param isAdmin - If true, returns ALL sites in organization (for super admin / org managers)
 * @param limit - Optional limit for pagination
 * @param offset - Optional offset for pagination
 * @param filter - Optional filter: 'all' | 'active' | 'disabled'
 * @returns Promise<IUserSites[]> - Sites with plan information and workspace data pre-aggregated
 */
export async function findUserSitesWithPlansWithWorkspaces(userId: number, organizationId: number, isAdmin: boolean, limit?: number, offset?: number, filter?: 'all' | 'active' | 'disabled'): Promise<IUserSites[]> {
  const now = database.raw('NOW()');
  if (isAdmin) {
    // Admin path: Get ALL sites in organization with workspace info via subquery to avoid GROUP BY issues
    let query = buildSitesBaseQuery()
      .where(`${TABLE}.organization_id`, organizationId)
      .select(...selectSiteFieldsWithMonitoring())
    
    // Apply filter
    if (filter === 'active') {
      query = query
        .where(`${TABLES.sitesPlans}.is_trial`, 0)
        .whereNotNull(`${TABLES.sitesPlans}.expired_at`)
        .where(`${TABLES.sitesPlans}.expired_at`, '>', now);
    } else if (filter === 'disabled') {
      query = query.where(function() {
        this.where(`${TABLES.sitesPlans}.is_trial`, 1)
          .orWhereNull(`${TABLES.sitesPlans}.expired_at`)
          .orWhere(`${TABLES.sitesPlans}.expired_at`, '<=', now);
      });
    }
    
    if (limit !== undefined) {
      query = query.limit(limit)
      // Only add OFFSET if LIMIT is also defined (MySQL requires LIMIT when using OFFSET)
      if (offset !== undefined) {
        query = query.offset(offset)
      }
    }
    
    return query
  } else {
    // Regular user path: Single query with OR condition (own sites OR workspace membership)
    // Workspace array aggregated in subquery to avoid GROUP BY complexity
    
    // Build filter condition first
    let filterCondition = '';
    if (filter === 'active') {
      filterCondition = `
        AND sp.is_trial = 0
        AND sp.expired_at IS NOT NULL
        AND sp.expired_at > NOW()
      `;
    } else if (filter === 'disabled') {
      filterCondition = `
        AND (sp.is_trial = 1 OR sp.expired_at IS NULL OR sp.expired_at <= NOW())
      `;
    }
    
    let sql = `
      SELECT DISTINCT
        ${TABLE}.id,
        ${TABLE}.user_id,
        ${TABLE}.url,
        ${TABLE}.created_at as createAt,
        ${TABLE}.updated_at as updatedAt,
        ${TABLE}.organization_id,
        sp.expired_at as expiredAt,
        sp.is_trial as trial,
        ${TABLE}.monitor_enabled,
        ${TABLE}.status,
        ${TABLE}.monitor_priority,
        ${TABLE}.last_monitor_check,
        ${TABLE}.is_currently_down,
        ${TABLE}.monitor_consecutive_fails,
        users.email as user_email,
        (
          SELECT JSON_ARRAYAGG(JSON_OBJECT('id', w.id, 'name', w.name))
          FROM ${TABLES.workspace_allowed_sites} was
          JOIN ${TABLES.workspaces} w ON was.workspace_id = w.id
          WHERE was.allowed_site_id = ${TABLE}.id
        ) as workspaces
      FROM ${TABLE}
      LEFT JOIN (
        SELECT sp2.allowed_site_id, sp2.expired_at, sp2.is_trial
        FROM ${TABLES.sitesPlans} sp2
        INNER JOIN (
          SELECT allowed_site_id, MAX(id) as max_id
          FROM ${TABLES.sitesPlans}
          GROUP BY allowed_site_id
        ) sp3 ON sp2.id = sp3.max_id
      ) sp ON sp.allowed_site_id = ${TABLE}.id
      LEFT JOIN ${TABLES.users} users ON ${TABLE}.user_id = users.id
      WHERE ${TABLE}.organization_id = ?
        AND (
          ${TABLE}.user_id = ?
          OR EXISTS (
            SELECT 1
            FROM ${TABLES.workspace_allowed_sites} was2
            JOIN ${TABLES.workspaces} w2 ON was2.workspace_id = w2.id
            JOIN ${TABLES.workspace_users} wu ON w2.id = wu.workspace_id
            WHERE was2.allowed_site_id = ${TABLE}.id
              AND wu.user_id = ?
              AND wu.status = 'active'
          )
        )
        ${filterCondition}
    `
    
    const params: any[] = [organizationId, userId, userId];
    
    if (limit !== undefined) {
      sql += ` LIMIT ?`
      params.push(limit)
      // Only add OFFSET if LIMIT is also defined (MySQL requires LIMIT when using OFFSET)
      if (offset !== undefined) {
        sql += ` OFFSET ?`
        params.push(offset)
      }
    }
    
    const sites = await database.raw(sql, params)
    return sites[0] // raw() returns [rows, fields]
  }
}

/**
 * Get sites available for adding to a workspace
 * For admins: Returns ALL organization sites
 * For regular users: Returns ONLY their own sites (user_id matches)
 *
 * @param userId - User ID
 * @param organizationId - Organization ID
 * @param isAdmin - If true, returns ALL sites in organization
 * @returns Promise<IUserSites[]> - Sites available for workspace assignment
 */
export async function findUserSitesWithPlansForWorkspace(userId: number, organizationId: number, isAdmin: boolean): Promise<IUserSites[]> {
  const query = buildSitesBaseQuery()

  if (isAdmin) {
    // Admin path: Get ALL sites in organization
    query.where(`${TABLE}.organization_id`, organizationId)
  } else {
    // Regular user path: Returns ONLY their own sites
    query.where({
      [`${TABLE}.organization_id`]: organizationId,
      [`${TABLE}.user_id`]: userId,
    })
  }

  return query.select(...selectSiteFields())
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
export async function deleteSiteWithRelatedRecords(url: string, user_id: number, organization_id?: number): Promise<number> {
  return database.transaction(async (trx) => {
    try {
      // Find the site within the transaction
      const whereClause: Record<string, string | number> = {
        [siteColumns.url]: url,
        [siteColumns.user_id]: user_id,
      }

      if (organization_id) {
        whereClause[siteColumns.organizationId] = organization_id
      }

      const site = await trx(TABLE).select(siteColumns).where(whereClause).first()

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

/**
 * Helper function to build base query for sites with plans and workspaces
 */
function buildSitesBaseQuery() {
  return database(TABLE)
    .leftJoin(TABLES.sitesPlans, function () {
      this.on(`${TABLES.sitesPlans}.allowed_site_id`, '=', `${TABLE}.id`).andOn(`${TABLES.sitesPlans}.id`, '=', database.raw(`(SELECT MAX(sp2.id) FROM ${TABLES.sitesPlans} sp2 WHERE sp2.allowed_site_id = ${TABLE}.id)`))
    })
    .leftJoin(TABLES.users, `${TABLE}.user_id`, `${TABLES.users}.id`)
}

/**
 * Helper function to get workspace aggregation subquery
 */
function getWorkspacesSubquery(): string {
  return `(SELECT JSON_ARRAYAGG(JSON_OBJECT('id', w.id, 'name', w.name))
    FROM ${TABLES.workspace_allowed_sites} was
    JOIN ${TABLES.workspaces} w ON was.workspace_id = w.id
    WHERE was.allowed_site_id = ${TABLE}.id
  )`
}

/**
 * Helper function to select common site fields (for workspace assignment)
 */
function selectSiteFields() {
  return [
    `${TABLE}.id`,
    `${TABLE}.user_id`,
    `${TABLE}.url`,
    `${TABLE}.created_at as createAt`,
    `${TABLE}.updated_at as updatedAt`,
    `${TABLE}.organization_id`,
    `${TABLES.sitesPlans}.expired_at as expiredAt`,
    `${TABLES.sitesPlans}.is_trial as trial`,
    `${TABLES.users}.email as user_email`,
    database.raw(`${getWorkspacesSubquery()} as workspaces`),
  ]
}

/**
 * Helper function to select site fields with monitoring info
 */
function selectSiteFieldsWithMonitoring() {
  return [
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
    `${TABLES.users}.email as user_email`,
    database.raw(`${getWorkspacesSubquery()} as workspaces`),
  ]
}
