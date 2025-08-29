import { findEngagementURLDate, findImpressionsURLDate, insertImpressionURL, updateImpressionProfileCount, updateImpressions } from '../../repository/impressions.clickhouse.repository'
import { findVisitorByIp } from '../../repository/visitors.clickhouse.repository'
import { getRootDomain, normalizeDomain } from '../../utils/domain.utils'
import { ValidationError } from '../../utils/graphql-errors.helper'
import logger from '../../utils/logger'
import { validateAddImpressionsURL, validateAddInteraction, validateAddProfileCount, validateFindImpressionsByURLAndDate, validateGetEngagementRates } from '../../validations/impression.validation'
import { findSite } from '../allowedSites/allowedSites.service'
import { addNewVisitor } from '../uniqueVisitors/uniqueVisitor.service'

export async function addImpressionsURL(ipAddress: string, url: string) {
  const validateResult = validateAddImpressionsURL({ ipAddress, url })

  if (Array.isArray(validateResult) && validateResult.length) {
    return new ValidationError(validateResult.map((it) => it.message).join(','))
  }
  const domain = getRootDomain(url)

  try {
    const visitor = await findVisitorByIp(ipAddress)

    if (visitor) {
      const data = {
        visitor_id: visitor.id,
      }

      const response = await insertImpressionURL(data, domain)
      return response
    }
    const site = await findSite(domain)

    if (!site) {
      throw new Error(`Site not found for domain: ${domain}`)
    }

    await addNewVisitor(ipAddress, site.id)

    const visitorSecond = await findVisitorByIp(ipAddress)

    if (!visitorSecond) {
      throw new Error('Visitor not found after creation')
    }

    const data = {
      visitor_id: visitorSecond.id,
    }

    const response = await insertImpressionURL(data, domain)

    return response
  } catch (error) {
    logger.error(error)
    throw error
  }
}

export async function findImpressionsByURLAndDate(userId: number, url: string, startDate: Date, endDate: Date) {
  const validateResult = validateFindImpressionsByURLAndDate({ url, startDate, endDate })

  if (Array.isArray(validateResult) && validateResult.length) {
    return new ValidationError(validateResult.map((it) => it.message).join(','))
  }

  const domain = normalizeDomain(url)

  try {
    const impressions = await findImpressionsURLDate(userId, domain, startDate, endDate)

    return { impressions, count: impressions.length }
  } catch (e) {
    logger.error('Error finding impressions by URL and date', {
      userId,
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

    return await updateImpressions(impressionId, interaction)
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
    const updatedRows = await updateImpressionProfileCount(impressionId, profileCount)

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

export async function getEngagementRates(userId: number, url: string, startDate: string, endDate: string) {
  const validateResult = validateGetEngagementRates({ url, startDate, endDate })

  if (Array.isArray(validateResult) && validateResult.length) {
    return new ValidationError(validateResult.map((it) => it.message).join(','))
  }

  const domain = normalizeDomain(url)

  try {
    const impressions = await findEngagementURLDate(userId, domain, startDate, endDate)
    return impressions
  } catch (e) {
    logger.error(e)
    throw e
  }
}
