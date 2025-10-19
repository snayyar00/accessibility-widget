import {
  findEngagementURLDate as findEngagementURLDateClickHouse,
  findImpressionsURLDate as findImpressionsURLDateClickHouse,
  insertImpressionURL as insertImpressionURLClickHouse,
  updateImpressionProfileCount as updateImpressionProfileCountClickHouse,
  updateImpressions as updateImpressionsClickHouse,
} from '../../repository/impressions.clickhouse.repository'
import {
  findEngagementURLDate as findEngagementURLDateSQL,
  findImpressionsURLDate as findImpressionsURLDateSQL,
  insertImpressionURL as insertImpressionURLSQL,
  updateImpressionProfileCount as updateImpressionProfileCountSQL,
  updateImpressions as updateImpressionsSQL,
} from '../../repository/impressions.repository'
import { findSiteByURL } from '../../repository/sites_allowed.repository'
import { UserProfile } from '../../repository/user.repository'
import { findVisitorByIp as findVisitorByIpClickHouse } from '../../repository/visitors.clickhouse.repository'
import { findVisitorByIp as findVisitorByIpSQL } from '../../repository/visitors.repository'
import { getCurrentDatabaseType, isClickHouseDisabled } from '../../utils/database.utils'
import { getRootDomain, normalizeDomain } from '../../utils/domain.utils'
import { ValidationError } from '../../utils/graphql-errors.helper'
import logger from '../../utils/logger'
import { validateAddImpressionsURL, validateAddInteraction, validateAddProfileCount, validateFindImpressionsByURLAndDate, validateGetEngagementRates } from '../../validations/impression.validation'
import { canAccessSite, findSite } from '../allowedSites/allowedSites.service'
import { addNewVisitor } from '../uniqueVisitors/uniqueVisitor.service'

export async function addImpressionsURL(ipAddress: string, url: string) {
  const validateResult = validateAddImpressionsURL({ ipAddress, url })

  if (Array.isArray(validateResult) && validateResult.length) {
    return new ValidationError(validateResult.map((it) => it.message).join(','))
  }
  const domain = getRootDomain(url)

  try {
    const visitor = isClickHouseDisabled() ? await findVisitorByIpSQL(ipAddress) : await findVisitorByIpClickHouse(ipAddress)

    if (visitor) {
      const data = {
        visitor_id: visitor.id,
      }

      const response = isClickHouseDisabled() ? await insertImpressionURLSQL(data, domain) : await insertImpressionURLClickHouse(data, domain)

      logger.info(`Using ${getCurrentDatabaseType()} for impression insertion`)
      return response
    }
    const site = await findSite(domain)

    if (!site) {
      throw new Error(`Site not found for domain: ${domain}`)
    }

    await addNewVisitor(ipAddress, site.id)

    const visitorSecond = isClickHouseDisabled() ? await findVisitorByIpSQL(ipAddress) : await findVisitorByIpClickHouse(ipAddress)

    if (!visitorSecond) {
      throw new Error('Visitor not found after creation')
    }

    const data = {
      visitor_id: visitorSecond.id,
    }

    const response = isClickHouseDisabled() ? await insertImpressionURLSQL(data, domain) : await insertImpressionURLClickHouse(data, domain)

    logger.info(`Using ${getCurrentDatabaseType()} for impression insertion after visitor creation`)

    return response
  } catch (error) {
    logger.error(error)
    throw error
  }
}

export async function findImpressionsByURLAndDate(user: UserProfile, url: string, startDate: Date, endDate: Date) {
  const validateResult = validateFindImpressionsByURLAndDate({ url, startDate, endDate })

  if (Array.isArray(validateResult) && validateResult.length) {
    return new ValidationError(validateResult.map((it) => it.message).join(','))
  }

  const domain = normalizeDomain(url)

  try {
    // Verify that the site exists
    const site = await findSiteByURL(domain)

    if (!site) {
      throw new Error('Site not found')
    }

    // Check if user has access to this site
    const hasAccess = await canAccessSite(user, site)
    if (!hasAccess) {
      throw new Error('Access denied: You do not have permission to view this site')
    }

    const impressions = isClickHouseDisabled() ? await findImpressionsURLDateSQL(user.id, domain, startDate, endDate) : await findImpressionsURLDateClickHouse(user.id, domain, startDate, endDate)

    logger.info(`Using ${getCurrentDatabaseType()} for impressions lookup by URL and date`)

    return { impressions, count: impressions.length }
  } catch (e) {
    logger.error('Error finding impressions by URL and date', {
      userId: user.id,
      domain: domain.substring(0, 50),
      dateRange: `${startDate.toISOString()} to ${endDate.toISOString()}`,
      error: e.message,
    })

    throw new Error('Failed to fetch impressions data')
  }
}

export async function addInteraction(impressionId: number, interaction: string) {
  const validateResult = validateAddInteraction({ impressionId, interaction })

  if (Array.isArray(validateResult) && validateResult.length) {
    return new ValidationError(validateResult.map((it) => it.message).join(','))
  }

  try {
    if (interaction !== 'widgetClosed' && interaction !== 'widgetOpened') {
      throw new Error('Invalid interaction type. Only "widgetClosed" or "widgetOpened" are acceptable.')
    }

    const result = isClickHouseDisabled() ? await updateImpressionsSQL(impressionId, interaction) : await updateImpressionsClickHouse(impressionId, interaction)

    logger.info(`Using ${getCurrentDatabaseType()} for impression interaction update`)
    return result
  } catch (e) {
    logger.error(e)
    throw e
  }
}

export async function addProfileCount(impressionId: number, profileCount: any): Promise<{ success: boolean; message: string }> {
  const validateResult = validateAddProfileCount({ impressionId, profileCount })

  if (Array.isArray(validateResult) && validateResult.length) {
    return {
      success: false,
      message: validateResult.map((it) => it.message).join(', '),
    }
  }

  try {
    const updatedRows = isClickHouseDisabled() ? await updateImpressionProfileCountSQL(impressionId, profileCount) : await updateImpressionProfileCountClickHouse(impressionId, profileCount)

    logger.info(`Using ${getCurrentDatabaseType()} for profile count update`)

    if (updatedRows > 0) {
      return {
        success: true,
        message: 'Profile counts updated successfully',
      }
    }
    return {
      success: false,
      message: 'No rows were updated. Invalid impression ID.',
    }
  } catch (e) {
    console.error('Error updating profile count:', e)
    logger.error(e)

    return {
      success: false,
      message: 'An error occurred while updating profile counts.',
    }
  }
}

export async function getEngagementRates(user: UserProfile, url: string, startDate: string, endDate: string) {
  const validateResult = validateGetEngagementRates({ url, startDate, endDate })

  if (Array.isArray(validateResult) && validateResult.length) {
    return new ValidationError(validateResult.map((it) => it.message).join(','))
  }

  const domain = normalizeDomain(url)

  try {
    // Verify that the site exists
    const site = await findSiteByURL(domain)

    if (!site) {
      throw new Error('Site not found')
    }

    // Check if user has access to this site
    const hasAccess = await canAccessSite(user, site)
    if (!hasAccess) {
      throw new Error('Access denied: You do not have permission to view this site')
    }

    const impressions = isClickHouseDisabled() ? await findEngagementURLDateSQL(user.id, domain, startDate, endDate) : await findEngagementURLDateClickHouse(user.id, domain, startDate, endDate)

    logger.info(`Using ${getCurrentDatabaseType()} for engagement rates lookup`)
    return impressions
  } catch (e) {
    logger.error(e)
    throw e
  }
}
