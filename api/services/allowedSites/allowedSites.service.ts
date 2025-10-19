import { TRIAL_PLAN_INTERVAL, TRIAL_PLAN_NAME } from '../../constants/billing.constant'
import compileEmailTemplate from '../../helpers/compile-email-template'
import { deleteSiteWithRelatedRecords, FindAllowedSitesProps, findSiteById, findSiteByURL, findUserSitesWithPlansWithWorkspaces, insertSite, IUserSites, toggleSiteMonitoring as toggleSiteMonitoringRepo, updateAllowedSiteURL } from '../../repository/sites_allowed.repository'
import { findUserNotificationByUserId, getUserbyId, UserProfile } from '../../repository/user.repository'
import { hasWorkspaceAccessToSite } from '../../repository/workspace_users.repository'
import { canManageOrganization } from '../../utils/access.helper'
import { normalizeDomain } from '../../utils/domain.utils'
import { generatePDF } from '../../utils/generatePDF'
import { ValidationError } from '../../utils/graphql-errors.helper'
import logger from '../../utils/logger'
import { generateSecureUnsubscribeLink, getUnsubscribeTypeForEmail } from '../../utils/secure-unsubscribe.utils'
import { validateChangeURL, validateDomain } from '../../validations/allowedSites.validation'
import { fetchAccessibilityReport } from '../accessibilityReport/accessibilityReport.service'
import { EmailAttachment, sendEmailWithRetries } from '../email/email.service'
import { getUserOrganization } from '../organization/organization_users.service'
import { createSitesPlan } from './plans-sites.service'

/**
 * Check if user has access to a site:
 * - Super admin or organization manager: full access
 * - Regular user: only own sites or workspace sites where they are active member
 */
export async function canAccessSite(user: UserProfile, site: FindAllowedSitesProps): Promise<boolean> {
  // Check organization match
  if (user.current_organization_id && site.organization_id !== user.current_organization_id) {
    return false
  }

  // Super admin has full access
  if (user.is_super_admin) {
    return true
  }

  // Owner has access
  if (site.user_id === user.id) {
    return true
  }

  // Organization manager has full access
  const userOrganization = await getUserOrganization(user.id, user.current_organization_id)

  if (userOrganization && canManageOrganization(userOrganization.role)) {
    return true
  }

  // Check workspace access via repository layer
  return hasWorkspaceAccessToSite(user.id, site.id)
}

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
  if ((responseData as { result: string }).result === 'WebAbility') {
    return 'Web Ability'
  }
  if ((responseData as { result: string }).result != 'Not Found') {
    return 'true'
  }
  return 'false'
}

/**
 * Create Document
 *
 * @param {UserProfile} user
 * @param {string} url
 */
export async function addSite(user: UserProfile, url: string): Promise<string> {
  const year = new Date().getFullYear()

  const validateResult = validateDomain({ url })

  if (Array.isArray(validateResult) && validateResult.length) {
    throw new ValidationError(validateResult.map((it) => it.message).join(','))
  }

  const domain = normalizeDomain(url)

  const userId = user.id
  const currentOrganizationId = user.current_organization_id

  try {
    const data = {
      user_id: userId,
      url: domain,
      organization_id: currentOrganizationId,
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

        let widgetStatus: string
        let status: string
        let score: number

        try {
          widgetStatus = await checkScript(domain)
          status = widgetStatus == 'true' || widgetStatus == 'Web Ability' ? 'Compliant' : 'Not Compliant'
          // For WebAbility, use the original report score - the PDF generator will add the bonus
          // For other cases, use the original report score
          score = report.score
        } catch (error) {
          logger.warn(`Failed to check script for domain ${domain}:`, error)
          // Fallback to default values when checkScript fails
          widgetStatus = 'false'
          status = 'Not Compliant'
          score = report.score
        }

        // Calculate total counts from both AXE and HTML_CS
        const errorsCount = (report?.axe?.errors?.length || 0) + (report?.htmlcs?.errors?.length || 0)
        const warningsCount = (report?.axe?.warnings?.length || 0) + (report?.htmlcs?.warnings?.length || 0)
        const noticesCount = (report?.axe?.notices?.length || 0) + (report?.htmlcs?.notices?.length || 0)
        const notification = (await findUserNotificationByUserId(user.id, user.current_organization_id)) as { new_domain_flag?: boolean } | null
        if (!notification || !notification.new_domain_flag) {
          console.log(`Skipping new domain email for user ${user.email} (no notification flag)`)
          return 'The site was successfully added.'
        }
        // Generate secure unsubscribe link for new domain alerts
        const unsubscribeLink = generateSecureUnsubscribeLink(user.email, getUnsubscribeTypeForEmail('domain'), user.id)

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
            unsubscribeLink,
            year,
          },
        })

        console.log('Starting PDF generation for domain:', domain)
        console.log('Report data keys:', Object.keys(report))
        console.log('Widget status:', widgetStatus)

        const pdfBlob = await generatePDF(
          {
            ...report, // Pass the full report data
            score: report.score,
            widgetInfo: { result: widgetStatus },
            scriptCheckResult: widgetStatus,
            url: domain,
          },
          'en',
          domain,
        )
        console.log('PDF generation completed, blob size:', pdfBlob.size)
        const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer())

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

export async function findUserSites(user: UserProfile): Promise<IUserSites[]> {
  if (!user.current_organization_id) {
    return []
  }

  try {
    const isSuperAdmin = user.is_super_admin
    const userOrganization = !isSuperAdmin ? await getUserOrganization(user.id, user.current_organization_id) : null

    const isManager = userOrganization && canManageOrganization(userOrganization.role)

    const allSites = await findUserSitesWithPlansWithWorkspaces(user.id, user.current_organization_id, isSuperAdmin || isManager)

    const sitesWithOwnership = allSites.map((site) => ({
      ...site,
      is_owner: site.user_id === user.id,
      workspaces: site.workspaces || [],
    }))

    // Sort by priority:
    // 1. My sites (owner) without workspace
    // 2. Other people's sites without workspace
    // 3. My sites (owner) in workspace
    // 4. Other people's sites in workspace
    return sitesWithOwnership.sort((a, b) => {
      const getPriority = (site: typeof a) => {
        const hasWorkspace = (site.workspaces?.length || 0) > 0

        if (site.is_owner && !hasWorkspace) return 1
        if (!site.is_owner && !hasWorkspace) return 2
        if (site.is_owner && hasWorkspace) return 3
        if (!site.is_owner && hasWorkspace) return 4

        return 5
      }

      return getPriority(a) - getPriority(b)
    })
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

export async function deleteSite(userId: number, url: string, organizationId?: number) {
  const validateResult = validateDomain({ url })

  if (Array.isArray(validateResult) && validateResult.length) {
    throw new ValidationError(validateResult.map((it) => it.message).join(','))
  }

  const domain = normalizeDomain(url)

  try {
    const deletedRecs = await deleteSiteWithRelatedRecords(domain, userId, organizationId)

    return deletedRecs
  } catch (e) {
    logger.error(e)
    throw e
  }
}

export async function changeURL(siteId: number, userId: number, url: string, organizationId?: number, isSuperAdmin?: boolean) {
  const validateResult = validateChangeURL({ url, siteId })

  if (Array.isArray(validateResult) && validateResult.length) {
    throw new ValidationError(validateResult.map((it) => it.message).join(','))
  }

  const domain = normalizeDomain(url)

  try {
    const site = await findSiteById(siteId)

    if (!site) {
      throw new ValidationError('Site not found.')
    }

    // Check organization_id if provided
    if (organizationId && site.organization_id !== organizationId) {
      throw new ValidationError('You do not have permission to change this site.')
    }

    // Only super admin, organization manager, or site owner can change URL
    const isOwner = site.user_id === userId

    if (!isSuperAdmin && !isOwner) {
      if (!organizationId) {
        throw new ValidationError('Organization ID is required.')
      }

      const userOrganization = await getUserOrganization(userId, organizationId)

      if (!userOrganization || !canManageOrganization(userOrganization.role)) {
        throw new ValidationError('Only site owner or organization administrators can change site URLs.')
      }
    }

    // Use the original site owner's user_id for the update
    const x = await updateAllowedSiteURL(siteId, domain, site.user_id)

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

export async function toggleSiteMonitoring(siteId: number, enabled: boolean, userId: number, organizationId?: number, isSuperAdmin?: boolean): Promise<boolean> {
  try {
    const site = await findSiteById(siteId)

    if (!site) {
      throw new ValidationError('Site not found.')
    }

    // Check organization_id if provided
    if (organizationId && site.organization_id !== organizationId) {
      throw new ValidationError('You do not have permission to modify this site.')
    }

    // Only super admin, organization manager, or site owner can toggle site monitoring
    const isOwner = site.user_id === userId

    if (!isSuperAdmin && !isOwner) {
      if (!organizationId) {
        throw new ValidationError('Organization ID is required.')
      }

      const userOrganization = await getUserOrganization(userId, organizationId)

      if (!userOrganization || !canManageOrganization(userOrganization.role)) {
        throw new ValidationError('Only site owner or organization administrators can toggle site monitoring.')
      }
    }

    // Use the original site owner's user_id for the update
    return toggleSiteMonitoringRepo(siteId, enabled, site.user_id, organizationId)
  } catch (e) {
    logger.error(e)
    throw e
  }
}
