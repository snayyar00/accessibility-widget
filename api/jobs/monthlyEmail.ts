import cron from 'node-cron'
import pLimit from 'p-limit'

import compileEmailTemplate from '../helpers/compile-email-template'
import { findSiteById } from '../repository/sites_allowed.repository'
import { getActiveSitesPlan } from '../repository/sites_plans.repository'
import { findUserNotificationByUserId, getUserbyId } from '../repository/user.repository'
import { fetchAccessibilityReport } from '../services/accessibilityReport/accessibilityReport.service'
import { checkScript } from '../services/allowedSites/allowedSites.service'
import { EmailAttachment, sendEmailWithRetries } from '../services/email/email.service'
import { generatePDF } from '../utils/generatePDF'
import logger from '../utils/logger'
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

const sendMonthlyEmails = async () => {
  try {
    const sitePlans = await getActiveSitesPlan()
    const year = new Date().getFullYear()

    // Limit concurrency to 2 tasks at a time
    const limit = pLimit(10)

    await Promise.allSettled(
      sitePlans.map((sitePlan: sitePlan) =>
        limit(async () => {
          try {
            const site: any = await findSiteById(sitePlan.siteId)
            if (!site) {
              console.error(`Site not found for allowedSiteId: ${sitePlan.siteId}`)
              return
            }

            const report = await fetchAccessibilityReport(site?.url)
            const user = await getUserbyId(site?.user_id)
            // Check user_notifications flag
            const notification = (await findUserNotificationByUserId(user.id)) as { monthly_report_flag?: boolean } | null
            if (!notification || !notification.monthly_report_flag) {
              console.log(`Skipping monthly report for user ${user.email} (no notification flag)`)
              return
            }
            let widgetStatus: string
            let status: string
            let score: number

            try {
              widgetStatus = await checkScript(site?.url)
              status = widgetStatus === 'true' || widgetStatus === 'Web Ability' ? 'Compliant' : 'Not Compliant'
              // For WebAbility, use the original report score - the PDF generator will add the bonus
              // For other cases, use the original report score
              score = report.score
            } catch (error) {
              logger.warn(`Failed to check script for domain ${site?.url}:`, error)
              // Fallback to default values when checkScript fails
              widgetStatus = 'false'
              status = 'Not Compliant'
              score = report.score
            }

            // Generate secure unsubscribe link for monthly reports
            const unsubscribeLink = generateSecureUnsubscribeLink(user.email, getUnsubscribeTypeForEmail('monthly'), user.id)

            const template = await compileEmailTemplate({
              fileName: 'accessReport.mjml',
              data: {
                status,
                url: site?.url,
                statusImage: report.siteImg,
                statusDescription: report.score > 89 ? 'You achieved exceptionally high compliance status!' : 'Your Site may not comply with WCAG 2.1 AA.',
                score,
                errorsCount: report.htmlcs.errors.length,
                warningsCount: report.htmlcs.warnings.length,
                noticesCount: report.htmlcs.notices.length,
                reportLink: 'https://app.webability.io/accessibility-test',
                unsubscribeLink,
                year,
              },
            })

            // Generate PDF attachment
            let attachments: EmailAttachment[] = []
            try {
              const pdfBlob = await generatePDF(
                {
                  ...report, // Pass the full report data
                  score: score,
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

            await sendEmailWithRetries(user.email, template, `Monthly Accessibility Report for ${site?.url}`, 2, 2000, attachments)
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

// Schedule the cron job to run monthly
const scheduleMonthlyEmails = () => {
  cron.schedule('0 0 1 * *', async () => {
    console.log('Running monthly email job...')
    await sendMonthlyEmails()
    console.log('Monthly email job completed.')
  })
}

export default scheduleMonthlyEmails
