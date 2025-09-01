import { TRIAL_PLAN_INTERVAL, TRIAL_PLAN_NAME } from '../../constants/billing.constant'
import compileEmailTemplate from '../../helpers/compile-email-template'
import { deleteSiteWithRelatedRecords, findSiteById, findSiteByURL, findSitesByUserId, insertSite, IUserSites, updateAllowedSiteURL } from '../../repository/sites_allowed.repository'
import { getSitePlanBySiteId } from '../../repository/sites_plans.repository'
import { findUserNotificationByUserId, getUserbyId } from '../../repository/user.repository'
import { normalizeDomain } from '../../utils/domain.utils'
import { ValidationError } from '../../utils/graphql-errors.helper'
import logger from '../../utils/logger'
import { generateAccessibilityReportPDF } from '../../utils/pdfGenerator'
import { validateChangeURL, validateDomain } from '../../validations/allowedSites.validation'
import { fetchAccessibilityReport } from '../accessibilityReport/accessibilityReport.service'
import { EmailAttachment, sendEmailWithRetries } from '../email/email.service'
import { createSitesPlan } from './plans-sites.service'

export async function checkScript(url: string) {
  const apiUrl = `${process.env.SECONDARY_SERVER_URL}/checkscript/?url=${url}`

  // Fetch the data from the secondary server
  const response = await fetch(apiUrl)

  // Check if the response is successful
  if (!response.ok) {
    throw new Error(`Failed to fetch the script check. Status: ${response.status}`)
  }

  // Parse the response as JSON
  const responseData = await response.json()

  // Access the result and respond accordingly
  if ((responseData as any).result === 'WebAbility') {
    return 'Web Ability'
  }
  if ((responseData as any).result != 'Not Found') {
    return 'true'
  }
  return 'false'
}

/**
 * Create Document
 *
 * @param {number} userId
 * @param {string} url
 */
export async function addSite(userId: number, url: string): Promise<string> {
  const year = new Date().getFullYear()

  const validateResult = validateDomain({ url })

  if (Array.isArray(validateResult) && validateResult.length) {
    throw new ValidationError(validateResult.map((it) => it.message).join(','))
  }

  const domain = normalizeDomain(url)

  try {
    const data = {
      user_id: userId,
      url: domain,
    }

    const response = await insertSite(data)

    if (typeof response === 'string') {
      throw new Error(response)
    }

    const site = response

    setImmediate(async () => {
      try {
        await createSitesPlan(userId, 'Trial', TRIAL_PLAN_NAME, TRIAL_PLAN_INTERVAL, site.id, '')

        const report = await fetchAccessibilityReport(domain)
        const user = await getUserbyId(userId)
        // Check user_notifications flag for new_domain_flag

        const widgetStatus = await checkScript(domain)
        const status = widgetStatus == 'true' || widgetStatus == 'Web Ability' ? 'Compliant' : 'Not Compliant'
        const score = widgetStatus == 'Web Ability' ? Math.floor(Math.random() * (100 - 90 + 1)) + 90 : widgetStatus == 'true' ? Math.floor(Math.random() * (88 - 80 + 1)) + 80 : report.score

        // Calculate total counts from both AXE and HTML_CS
        const errorsCount = (report?.axe?.errors?.length || 0) + (report?.htmlcs?.errors?.length || 0)
        const warningsCount = (report?.axe?.warnings?.length || 0) + (report?.htmlcs?.warnings?.length || 0)
        const noticesCount = (report?.axe?.notices?.length || 0) + (report?.htmlcs?.notices?.length || 0)

        const notification = (await findUserNotificationByUserId(user.id)) as { new_domain_flag?: boolean } | null
        if (!notification || !notification.new_domain_flag) {
          console.log(`Skipping new domain email for user ${user.email} (no notification flag)`)
          return 'The site was successfully added.'
        }
        const template = await compileEmailTemplate({
          fileName: 'accessReport.mjml',
          data: {
            status,
            url: domain,
            statusImage: report?.siteImg,
            statusDescription: report?.score > 89 ? 'You achieved exceptionally high compliance status!' : 'Your Site may not comply with WCAG 2.1 AA.',
            score,
            errorsCount: errorsCount,
            warningsCount: warningsCount,
            noticesCount: noticesCount,
            reportLink: 'https://app.webability.io/accessibility-test',
            year,
          },
        })

        const pdfBuffer = await generateAccessibilityReportPDF(report, url)

        const attachments: EmailAttachment[] = [
          {
            content: pdfBuffer,
            name: `accessibility-report-${url.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`,
          },
        ]

        await sendEmailWithRetries(user.email, template, `Accessibility Report for ${url}`, 5, 2000, attachments)
      } catch (error) {
        logger.error('Async email/report task failed:', error)
      }
    })

    return 'The site was successfully added.'
  } catch (error) {
    logger.error(error)
    throw error
  }
}

/**
 * Get List Documents
 *
 * @param {number} offset
 * @param {number} limit
 *
 */

export async function findUserSites(userId: number): Promise<IUserSites[]> {
  try {
    const sites = await findSitesByUserId(userId)

    const result = await Promise.all(
      sites.map(async (site) => {
        const data = await getSitePlanBySiteId(site.id)

        return {
          ...site,
          expiredAt: data?.expiredAt,
          trial: data?.isTrial,
        }
      }),
    )

    return result
  } catch (e) {
    logger.error(e)
    throw e
  }
}

export async function findSite(url: string) {
  try {
    const site = await findSiteByURL(url)
    return site
  } catch (e) {
    logger.error(e)
    throw e
  }
}

export async function deleteSite(userId: number, url: string) {
  const validateResult = validateDomain({ url })

  if (Array.isArray(validateResult) && validateResult.length) {
    throw new ValidationError(validateResult.map((it) => it.message).join(','))
  }

  const domain = normalizeDomain(url)

  try {
    const deletedRecs = await deleteSiteWithRelatedRecords(domain, userId)

    return deletedRecs
  } catch (e) {
    logger.error(e)
    throw e
  }
}

export async function changeURL(siteId: number, userId: number, url: string) {
  const validateResult = validateChangeURL({ url, siteId })

  if (Array.isArray(validateResult) && validateResult.length) {
    throw new ValidationError(validateResult.map((it) => it.message).join(','))
  }

  const domain = normalizeDomain(url)

  try {
    const site = await findSiteById(siteId)

    if (!site || site.user_id !== userId) {
      throw new ValidationError('You do not have permission to change this site.')
    }

    const x = await updateAllowedSiteURL(siteId, domain, userId)

    if (x > 0) return 'Successfully updated URL'
    return 'Could not change URL'
  } catch (e) {
    logger.error(e)
    throw e
  }
}

export async function isDomainAlreadyAdded(url: string): Promise<boolean> {
  const validateResult = validateDomain({ url })

  if (Array.isArray(validateResult) && validateResult.length) {
    throw new ValidationError(validateResult.map((it) => it.message).join(','))
  }

  const domain = normalizeDomain(url)

  try {
    const site = await findSiteByURL(domain)
    // If site is found, it means the domain is already added
    return !!site
  } catch (error) {
    // If error is "Site not found" type, return false
    if (error.message && error.message.includes('not found')) {
      return false
    }
    // For other errors, re-throw
    logger.error(error)
    throw error
  }
}
