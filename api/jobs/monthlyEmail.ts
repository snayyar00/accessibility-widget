import cron from 'node-cron'
import pLimit from 'p-limit'

import { QUEUE_PRIORITY } from '../constants/queue-priority.constant'
import compileEmailTemplate from '../helpers/compile-email-template'
import { findSiteById } from '../repository/sites_allowed.repository'
import { getActiveSitesPlan } from '../repository/sites_plans.repository'
import { findUserNotificationByUserId, getUserbyId } from '../repository/user.repository'
import { fetchAccessibilityReport } from '../services/accessibilityReport/accessibilityReport.service'
import { checkScript } from '../services/allowedSites/allowedSites.service'
import { EmailAttachment, sendEmailWithRetries } from '../services/email/email.service'
import { generatePDF } from '../utils/generatePDF'
import logger from '../utils/logger'
import { getOrganizationSmtpConfig } from '../utils/organizationSmtp.utils'
import { generateSecureUnsubscribeLink, getUnsubscribeTypeForEmail } from '../utils/secure-unsubscribe.utils'

interface sitePlan {
  id: any
  siteId: number
  productId: any
  priceId: any
  subcriptionId: any
  customerId: any
  isTrial: any
  expiredAt: any
  isActive: any
  createAt: any
  updatedAt: any
  deletedAt: any
}

/**
 * Check if today is a monthly anniversary of the site's creation date
 * @param createdAt - ISO date string of when the site was created
 * @returns boolean - true if today is a monthly anniversary
 */
const isMonthlyAnniversary = (createdAt: string): boolean => {
  if (!createdAt) return false

  const today = new Date()
  const created = new Date(createdAt)

  // Check if the day of month matches (or it's the last day of month for dates like Jan 31 -> Feb 28)
  const todayDay = today.getDate()
  const createdDay = created.getDate()

  // Get the last day of current month
  const lastDayOfCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()

  // For sites created on 29, 30, or 31, and current month doesn't have that day,
  // send on the last day of the month
  if (createdDay > lastDayOfCurrentMonth) {
    return todayDay === lastDayOfCurrentMonth
  }

  // Otherwise, send on the same day of month
  return todayDay === createdDay
}

const sendMonthlyEmails = async () => {
  try {
    const allSitePlans = await getActiveSitesPlan()

    // Filter sites that are due for their monthly email today (based on creation date anniversary)
    const sitePlans = allSitePlans.filter((sitePlan: sitePlan) => {
      const createdAt = sitePlan.createAt
      if (!createdAt) {
        console.log(`Skipping site ${sitePlan.siteId} - no creation date found`)
        return false
      }

      const isDue = isMonthlyAnniversary(createdAt)
      if (isDue) {
        console.log(`Site ${sitePlan.siteId} is due for monthly email (created on ${createdAt})`)
      }
      return isDue
    })

    console.log(`Found ${sitePlans.length} sites due for monthly emails today (out of ${allSitePlans.length} total active sites)`)

    const year = new Date().getFullYear()

    // Limit concurrency to 10 tasks at a time
    const limit = pLimit(6)

    await Promise.allSettled(
      sitePlans.map((sitePlan: sitePlan) =>
        limit(async () => {
          try {
            const site: any = await findSiteById(sitePlan.siteId)
            if (!site) {
              console.error(`Site not found for allowedSiteId: ${sitePlan.siteId}`)
              return
            }

            const report = await fetchAccessibilityReport({ url: site?.url, priority: QUEUE_PRIORITY.LOW })
            const user = await getUserbyId(site?.user_id)

            if (!user || !user.current_organization_id) {
              console.log(`Skipping monthly report - user ${site?.user_id} not found or has no current_organization_id`)
              return
            }

            // Check user_notifications flag
            const notification = (await findUserNotificationByUserId(user.id, user.current_organization_id)) as { monthly_report_flag?: boolean } | null
            if (!notification || !notification.monthly_report_flag) {
              console.log(`Skipping monthly report for user ${user.email} (no notification flag)`)
              return
            }
            let widgetStatus: string
            let status: string
            let score: number

            // Use widget status from report (Puppeteer detection) if available, otherwise fallback to API check
            widgetStatus = (report as any)?.scriptCheckResult ?? (await checkScript(site?.url))
            status = widgetStatus === 'true' || widgetStatus === 'Web Ability' ? 'Compliant' : 'Not Compliant'
            // For WebAbility, use the original report score - the PDF generator will add the bonus
            // For other cases, use the original report score
            score = report.score

            // Generate secure unsubscribe link for monthly reports
            const unsubscribeLink = generateSecureUnsubscribeLink(user.email, getUnsubscribeTypeForEmail('monthly'), user.id)

            // Use the same score shown in the PDF:
            // 1) Prefer processed enhanced score when available
            // 2) Otherwise, if WebAbility is active, add the 45 bonus (capped at 95)
            // 3) Otherwise, use the raw scanner score
            const enhancedFromReport = (report as any)?.totalStats?.score
            const displayedScore = typeof enhancedFromReport === 'number' ? enhancedFromReport : widgetStatus === 'true' || widgetStatus === 'Web Ability' ? Math.min((score || 0) + 45, 95) : score || 0

            const complianceByScore = displayedScore >= 80 ? 'Compliant' : displayedScore >= 50 ? 'Partially Compliant' : 'Not Compliant'

            // Calculate total counts from both AXE and HTML_CS (same logic as new domain emails)
            const errorsCount = (report?.axe?.errors?.length || 0) + (report?.htmlcs?.errors?.length || 0)
            const warningsCount = (report?.axe?.warnings?.length || 0) + (report?.htmlcs?.warnings?.length || 0)
            const noticesCount = (report?.axe?.notices?.length || 0) + (report?.htmlcs?.notices?.length || 0)

            const smtpConfigForTemplate = user.current_organization_id ? await getOrganizationSmtpConfig(user.current_organization_id) : null
            const organizationName = smtpConfigForTemplate?.organizationName ?? 'WebAbility'

            const template = await compileEmailTemplate({
              fileName: 'accessReport.mjml',
              data: {
                status,
                url: site?.url,
                statusImage: report.siteImg,
                statusDescription: complianceByScore,
                score: displayedScore,
                errorsCount: errorsCount,
                warningsCount: warningsCount,
                noticesCount: noticesCount,
                reportLink: 'https://app.webability.io/accessibility-test',
                unsubscribeLink,
                year,
                organizationName,
              },
            })

            // Generate PDF attachment
            let attachments: EmailAttachment[] = []
            try {
              const pdfBlob = await generatePDF(
                {
                  ...report, // Pass the full report data
                  score: report.score,
                  widgetInfo: { result: widgetStatus },
                  scriptCheckResult: widgetStatus,
                  url: site?.url,
                },
                'en',
                site?.url,
              )
              const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer())
              attachments = [
                {
                  content: pdfBuffer,
                  name: `accessibility-report-${site?.url.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`,
                },
              ]
            } catch (pdfError) {
              console.error(`Failed to generate PDF for site ${site?.url}:`, pdfError)
            }

            await sendEmailWithRetries(user.email, template, `Monthly Accessibility Report for ${site?.url}`, 2, 2000, attachments, 'WebAbility Reports', smtpConfigForTemplate)
            console.log(`Email with PDF attachment successfully sent to ${user.email} for site ${site?.url}`)
          } catch (error) {
            console.error(`Error processing sitePlan ${sitePlan.siteId}:`, error)
          }
        }),
      ),
    )
  } catch (error) {
    console.error('Error in sendMonthlyEmails:', error)
  }
}

// Schedule the cron job to run daily (checks for monthly anniversaries)
const scheduleMonthlyEmails = () => {
  cron.schedule('0 0 * * *', async () => {
    console.log('Running monthly anniversary email job...')
    await sendMonthlyEmails()
    console.log('Monthly anniversary email job completed.')
  })
}

export default scheduleMonthlyEmails
