import { findVisitorByURL as findVisitorByURLClickHouse, findVisitorByURLDate as findVisitorByURLDateClickHouse, insertVisitor as insertVisitorClickHouse } from '../../repository/visitors.clickhouse.repository'
import { findVisitorByURL as findVisitorByURLSQL, findVisitorByURLDate as findVisitorByURLDateSQL, findVisitorCountBySiteIdAndDate, insertVisitor as insertVisitorSQL } from '../../repository/visitors.repository'
import { findSiteByURL } from '../../repository/sites_allowed.repository'
import { getCurrentDatabaseType, isClickHouseDisabled } from '../../utils/database.utils'
import { normalizeDomain } from '../../utils/domain.utils'
import { ValidationError } from '../../utils/graphql-errors.helper'
import logger from '../../utils/logger'
import { validateGetSiteVisitorsByURL } from '../../validations/uniqueVisitor.validation'
import { canAccessSite } from '../allowedSites/allowedSites.service'
import { UserLogined } from '../authentication/get-user-logined.service'

export async function addNewVisitor(ipAddress: string, siteId: number): Promise<number[]> {
  try {
    const data = {
      ip_address: ipAddress,
      site_id: siteId,
    }

    const response = isClickHouseDisabled() ? await insertVisitorSQL(data) : await insertVisitorClickHouse(data)

    logger.info(`Using ${getCurrentDatabaseType()} for visitor insertion`)

    return response
  } catch (error) {
    logger.error(error)

    throw error
  }
}

export async function getSiteVisitorsByURL(url: string, user: UserLogined, startDate?: Date, endDate?: Date) {
  const validateResult = validateGetSiteVisitorsByURL({ url, startDate, endDate })

  if (Array.isArray(validateResult) && validateResult.length) {
    return new ValidationError(validateResult.map((it) => it.message).join(','))
  }

  const domain = normalizeDomain(url)
  const perfStart = Date.now()

  try {
    // OPTIMIZATION: Single site lookup + access check (replaces expensive findUserSites)
    const site = await findSiteByURL(domain)
    
    if (!site) {
      throw new Error('Site not found')
    }
    
    // Quick access check without fetching all sites
    const hasAccess = await canAccessSite(user, site)
    if (!hasAccess) {
      throw new Error('Access denied: You do not have permission to view this site')
    }
    
    let count: number
    
    if (startDate && endDate) {
      // OPTIMIZATION: Use COUNT query directly with site_id (no JOIN needed)
      if (isClickHouseDisabled()) {
        count = await findVisitorCountBySiteIdAndDate(site.id, startDate, endDate)
        logger.info(`Using SQL for visitor count with date filter: ${Date.now() - perfStart}ms`)
      } else {
        // ClickHouse version still uses the existing function for now
        const visitors = await findVisitorByURLDateClickHouse(domain, startDate, endDate)
        count = visitors.length
        logger.info(`Using ClickHouse for visitor count with date filter: ${Date.now() - perfStart}ms`)
      }
    } else {
      // Use non-filtered query when no dates provided
      const visitors = isClickHouseDisabled() ? await findVisitorByURLSQL(domain) : await findVisitorByURLClickHouse(domain)
      count = visitors.length
      logger.info(`Using ${getCurrentDatabaseType()} for visitor lookup without date filter: ${Date.now() - perfStart}ms`)
    }

    return { count }
  } catch (e) {
    logger.error(e)
    throw e
  }
}
