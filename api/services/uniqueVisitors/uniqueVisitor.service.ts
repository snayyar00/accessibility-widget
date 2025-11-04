import { findVisitorByURL as findVisitorByURLClickHouse, findVisitorByURLDate as findVisitorByURLDateClickHouse, insertVisitor as insertVisitorClickHouse } from '../../repository/visitors.clickhouse.repository'
import { findVisitorByURL as findVisitorByURLSQL, findVisitorByURLDate as findVisitorByURLDateSQL, insertVisitor as insertVisitorSQL } from '../../repository/visitors.repository'
import { getCurrentDatabaseType, isClickHouseDisabled } from '../../utils/database.utils'
import { normalizeDomain } from '../../utils/domain.utils'
import { ValidationError } from '../../utils/graphql-errors.helper'
import logger from '../../utils/logger'
import { validateGetSiteVisitorsByURL } from '../../validations/uniqueVisitor.validation'
import { findUserSites } from '../allowedSites/allowedSites.service'
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

  try {
    const userSites = await findUserSites(user)
    const userSiteIds = userSites.map((site) => site.id)

    let visitors
    if (startDate && endDate) {
      // Use date-filtered query when dates are provided
      visitors = isClickHouseDisabled() ? await findVisitorByURLDateSQL(domain, startDate, endDate) : await findVisitorByURLDateClickHouse(domain, startDate, endDate)
      logger.info(`Using ${getCurrentDatabaseType()} for visitor lookup with date filter: ${startDate.toISOString()} to ${endDate.toISOString()}`)
    } else {
      // Use non-filtered query when no dates provided
      visitors = isClickHouseDisabled() ? await findVisitorByURLSQL(domain) : await findVisitorByURLClickHouse(domain)
      logger.info(`Using ${getCurrentDatabaseType()} for visitor lookup without date filter`)
    }

    const filteredVisitors = visitors.filter((v) => userSiteIds.includes(v.siteId))

    return { visitors: filteredVisitors, count: filteredVisitors.length }
  } catch (e) {
    logger.error(e)
    throw e
  }
}
