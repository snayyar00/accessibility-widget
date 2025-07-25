import { UserProfile } from '../../repository/user.repository'
import { findVisitorByURL, insertVisitor } from '../../repository/visitors.repository'
import { normalizeDomain } from '../../utils/domain.utils'
import { ValidationError } from '../../utils/graphql-errors.helper'
import logger from '../../utils/logger'
import { validateGetSiteVisitorsByURL } from '../../validations/uniqueVisitor.validation'
import { findUserSites } from '../allowedSites/allowedSites.service'

/**
 * Create Document
 *
 * @param {number} userId
 * @param {string} url
 */
export async function addNewVisitor(ipAddress: string, siteId: number): Promise<number[]> {
  try {
    const data = {
      ip_address: ipAddress,
      site_id: siteId,
    }

    const response = await insertVisitor(data)

    return response
  } catch (error) {
    logger.error(error)

    throw error
  }
}

export async function getSiteVisitorsByURL(url: string, user: UserProfile) {
  const validateResult = validateGetSiteVisitorsByURL({ url })

  if (Array.isArray(validateResult) && validateResult.length) {
    return new ValidationError(validateResult.map((it) => it.message).join(','))
  }

  const domain = normalizeDomain(url)

  try {
    const userSites = await findUserSites(user.id)
    const userSiteIds = userSites.map((site) => site.id)

    const visitors = await findVisitorByURL(domain)
    const filteredVisitors = visitors.filter((v: any) => userSiteIds.includes(v.siteId))

    return { visitors: filteredVisitors, count: filteredVisitors.length }
  } catch (e) {
    logger.error(e)
    throw e
  }
}
