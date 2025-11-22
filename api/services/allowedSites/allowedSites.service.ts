import { TRIAL_PLAN_INTERVAL, TRIAL_PLAN_NAME } from '../../constants/billing.constant'
import { QUEUE_PRIORITY } from '../../constants/queue-priority.constant'
import compileEmailTemplate from '../../helpers/compile-email-template'
import {
  deleteSiteWithRelatedRecords,
  FindAllowedSitesProps,
  findSiteById,
  findSiteByURL,
  findUserSitesWithPlansForWorkspace,
  findUserSitesWithPlansWithWorkspaces,
  insertSite,
  IUserSites,
  toggleSiteMonitoring as toggleSiteMonitoringRepo,
  updateAllowedSiteURL,
} from '../../repository/sites_allowed.repository'
import { findUserNotificationByUserId, getUserbyId } from '../../repository/user.repository'
import { hasWorkspaceAccessToSite } from '../../repository/workspace_users.repository'
import { canManageOrganization } from '../../utils/access.helper'
import { normalizeDomain } from '../../utils/domain.utils'
import { generatePDF } from '../../utils/generatePDF'
import { ValidationError } from '../../utils/graphql-errors.helper'
import logger from '../../utils/logger'
import { generateSecureUnsubscribeLink, getUnsubscribeTypeForEmail } from '../../utils/secure-unsubscribe.utils'
import { validateChangeURL, validateDomain } from '../../validations/allowedSites.validation'
import { fetchAccessibilityReport } from '../accessibilityReport/accessibilityReport.service'
import { UserLogined } from '../authentication/get-user-logined.service'
import { EmailAttachment, sendEmailWithRetries } from '../email/email.service'
import { getUserOrganization } from '../organization/organization_users.service'
import { createSitesPlan } from './plans-sites.service'

/**
 * Check if user is super admin or organization manager
 */
async function isAdminOrManager(user: UserLogined): Promise<boolean> {
  if (user.is_super_admin) {
    return true
  }

  return user.currentOrganizationUser ? canManageOrganization(user.currentOrganizationUser.role) : false
}

export async function checkScript(url: string, retries = 3): Promise<string> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const apiUrl = `${process.env.SECONDARY_SERVER_URL}/checkscript/?url=${url}`

      // Set up timeout to prevent hanging requests
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      const response = await fetch(apiUrl, {
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        if (attempt === retries) {
          logger.warn(`Failed to check script for ${url} after ${retries} attempts, returning 'false'`)
          return 'false'
        }
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000))
        continue
      }

      const responseData = await response.json()

      if ((responseData as { result: string }).result === 'WebAbility') {
        return 'Web Ability'
      }
      if ((responseData as { result: string }).result !== 'Not Found') {
        return 'true'
      }
      return 'false'
    } catch (error) {
      if (attempt === retries) {
        logger.warn(`Failed to check script for ${url} after ${retries} attempts: ${error.message}`)
        return 'false'
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000))
    }
  }
  return 'false'
}

/**
 * Create Document
 *
 * @param {UserLogined} user
 * @param {string} url
 */
export async function addSite(user: UserLogined, url: string): Promise<string> {
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
        await createSitesPlan(userId, 'Trial', TRIAL_PLAN_NAME, TRIAL_PLAN_INTERVAL, site.id, '', currentOrganizationId)

        const report = await fetchAccessibilityReport({ url: domain, priority: QUEUE_PRIORITY.LOW })
        const user = await getUserbyId(userId)
        // Check user_notifications flag for new_domain_flag

        let widgetStatus: string
        let status: string
        let score: number

        // Use widget status from report (Puppeteer detection) if available, otherwise fallback to API check
        widgetStatus = (report as any)?.scriptCheckResult ?? (await checkScript(domain))
        status = widgetStatus === 'true' || widgetStatus === 'Web Ability' ? 'Compliant' : 'Not Compliant'
        // For WebAbility, use the original report score - the PDF generator will add the bonus
        // For other cases, use the original report score
        score = report.score

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

        // Match PDF scoring logic for emails
        const enhancedFromReport = (report as any)?.totalStats?.score
        const displayedScore = typeof enhancedFromReport === 'number' ? enhancedFromReport : widgetStatus === 'true' || widgetStatus === 'Web Ability' ? Math.min((score || 0) + 45, 95) : score || 0

        const complianceByScore = displayedScore >= 80 ? 'Compliant' : displayedScore >= 50 ? 'Partially Compliant' : 'Not Compliant'

        const template = await compileEmailTemplate({
          fileName: 'accessReport.mjml',
          data: {
            status,
            url: domain,
            statusImage: report?.siteImg,
            statusDescription: complianceByScore,
            score: displayedScore,
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

        await sendEmailWithRetries(user.email, template, `Accessibility Report for ${url}`, 5, 2000, attachments, 'WebAbility Reports')
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

export async function findUserSites(user: UserLogined): Promise<IUserSites[]> {
  if (!user.current_organization_id) {
    return []
  }

  try {
    const isAdmin = await isAdminOrManager(user)
    const allSites = await findUserSitesWithPlansWithWorkspaces(user.id, user.current_organization_id, isAdmin)
    const sitesWithOwnership = addOwnershipFlag(allSites, user.id)

    return sortSitesByPriorityAndAlphabetically(sitesWithOwnership)
  } catch (e) {
    logger.error(e)
    throw e
  }
}

/**
 * Get sites available for adding to a workspace
 * For admins/managers: Returns ALL organization sites
 * For regular users: Returns ONLY their own sites
 */
export async function findAvailableSitesForWorkspaceAssignment(user: UserLogined): Promise<IUserSites[]> {
  if (!user.current_organization_id) {
    return []
  }

  try {
    const isAdmin = await isAdminOrManager(user)
    const allSites = await findUserSitesWithPlansForWorkspace(user.id, user.current_organization_id, isAdmin)
    const sitesWithOwnership = addOwnershipFlag(allSites, user.id)

    return sortSitesByPriorityAndAlphabetically(sitesWithOwnership)
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

/**
 * Sort sites by priority and alphabetically
 * Priority order:
 * 1. My sites (owner) without workspace
 * 2. Other people's sites without workspace
 * 3. My sites (owner) in workspace
 * 4. Other people's sites in workspace
 */
function sortSitesByPriorityAndAlphabetically(sites: IUserSites[]): IUserSites[] {
  return sites.sort((a, b) => {
    const getPriority = (site: IUserSites) => {
      const hasWorkspace = (site.workspaces?.length || 0) > 0

      if (site.is_owner && !hasWorkspace) return 1
      if (!site.is_owner && !hasWorkspace) return 2
      if (site.is_owner && hasWorkspace) return 3
      if (!site.is_owner && hasWorkspace) return 4

      return 5
    }

    const priorityA = getPriority(a)
    const priorityB = getPriority(b)

    // First sort by priority
    if (priorityA !== priorityB) {
      return priorityA - priorityB
    }

    // Then sort alphabetically by URL within the same priority
    return a.url.localeCompare(b.url)
  })
}

/**
 * Add ownership flag to sites
 */
function addOwnershipFlag(sites: IUserSites[], userId: number): IUserSites[] {
  return sites.map((site) => ({
    ...site,
    is_owner: site.user_id === userId,
    workspaces: site.workspaces || [],
  }))
}

/**
 * Check if user has access to a site:
 * - Super admin or organization manager: full access
 * - Regular user: only own sites or workspace sites where they are active member
 */
export async function canAccessSite(user: UserLogined, site: FindAllowedSitesProps): Promise<boolean> {
  // Check organization match - only deny if both have org IDs and they don't match
  // Sites without organization_id (NULL) should fall through to ownership/workspace checks
  if (user.current_organization_id && site.organization_id && site.organization_id !== user.current_organization_id) {
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

  if (user.currentOrganizationUser && canManageOrganization(user.currentOrganizationUser.role)) {
    return true
  }

  return hasWorkspaceAccessToSite(user.id, site.id)
}
