import { getOrganizationById } from '../services/organization/organization.service'
import { getRootDomain, normalizeDomain } from '../utils/domain.utils'
import logger from '../utils/logger'
import { validateTokenUrl } from '../validations/widget.validation'
import { Organization } from './organization.repository'
import { findSiteByURL } from './sites_allowed.repository'
import { getSitePlanBySiteId } from './sites_plans.repository'
import { getUserbyId } from './user.repository'
import { getWidgetSettingsBySiteId } from './widget_settings.repository'

export async function ValidateToken(url: string): Promise<{
  validation: string
  savedState: any
  organization: Organization | null | undefined
  error?: string
}> {
  const rootDomain = getRootDomain(url)
  const validateResult = validateTokenUrl({ url: rootDomain })

  if (Array.isArray(validateResult) && validateResult.length) {
    console.error('Error in ValidateToken:', validateResult)
    logger.error('There was an error validating the provided unique token.', validateResult)

    return {
      validation: 'error',
      savedState: null,
      organization: null,
    }
  }

  const domain = normalizeDomain(rootDomain)

  let widgetSettings
  let organization: Organization | undefined

  try {
    const site = await findSiteByURL(domain)
    const user = await getUserbyId(site.user_id)

    const [orgResult, widgetResult] = await Promise.all([getOrganizationById(user.current_organization_id, user), getWidgetSettingsBySiteId(site.id)])

    organization = orgResult
    widgetSettings = widgetResult?.settings || {}
  } catch (error) {
    console.error(error)
    widgetSettings = {}
    organization = null
  }

  try {
    if (domain === 'webability.io' || domain === 'localhost') {
      return {
        validation: 'found',
        savedState: widgetSettings,
        organization,
      }
    }

    const site = await findSiteByURL(domain)
    const activePlan = site ? await getSitePlanBySiteId(site.id) : null

    if (!activePlan) {
      return {
        validation: 'notFound',
        savedState: null,
        organization: null,
      }
    }

    const currentTime = new Date().getTime()
    const timeDifference = new Date(activePlan?.expiredAt).getTime() - currentTime
    const sevendays = 7 * 24 * 60 * 60 * 1000

    if (timeDifference > sevendays) {
      return {
        validation: 'found',
        savedState: widgetSettings,
        organization,
      }
    }

    if (timeDifference < sevendays && timeDifference > 0) {
      return {
        validation: 'found',
        savedState: widgetSettings,
        organization,
      }
    }

    return {
      validation: 'notFound',
      savedState: null,
      organization: null,
    }
  } catch (error) {
    console.error('Error in ValidateToken:', error)
    logger.error('There was an error validating the provided unique token.', error)

    return {
      validation: 'error',
      savedState: null,
      organization: null,
    }
  }
}
