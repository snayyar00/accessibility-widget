import database from '../../config/database.config'
import { TABLES } from '../../constants/database.constant'
import compileEmailTemplate from '../../helpers/compile-email-template'
import { findSiteById } from '../../repository/sites_allowed.repository'
import { findUserById, findUserNotificationByUserId } from '../../repository/user.repository'
import logger from '../../utils/logger'
import { generateSecureUnsubscribeLink, getUnsubscribeTypeForEmail } from '../../utils/secure-unsubscribe.utils'
import { sendMail } from '../email/email.service'

export interface MonitoringResult {
  site_id: number
  url: string
  name?: string
  is_down: boolean
  status_code?: number
  response_time_ms?: number
  error?: string
  checked_at: string
}

export interface MonitoringBatch {
  results: MonitoringResult[]
  batch_id: string
  timestamp: string
}

// Store last status in memory for testing
const lastStatusMap = new Map<number, string>()

/**
 * Process a batch of monitoring results - SIMPLIFIED VERSION
 */
export async function processMonitoringBatch(batch: MonitoringBatch): Promise<void> {
  logger.info(`Processing monitoring batch ${batch.batch_id} with ${batch.results.length} results`)

  for (const result of batch.results) {
    try {
      await processSingleMonitoringResult(result)
    } catch (error) {
      logger.error(`Error processing monitoring result for site ${result.site_id}:`, error)
    }
  }
}

/**
 * Process a single monitoring result - SIMPLIFIED VERSION
 */
async function processSingleMonitoringResult(result: MonitoringResult): Promise<void> {
  const currentStatus = result.is_down ? 'down' : 'up'
  const lastStatus = lastStatusMap.get(result.site_id)

  // Update the in-memory status
  lastStatusMap.set(result.site_id, currentStatus)

  // Update database with numeric status (0 = up, 1 = down)
  try {
    await database(TABLES.allowed_sites)
      .where('id', result.site_id)
      .update({
        is_currently_down: result.is_down ? 1 : 0, // 0=up, 1=down
        last_monitor_check: result.checked_at,
      })
  } catch (error) {
    logger.error(`Failed to update monitoring status for site ${result.site_id}:`, error)
  }

  // Check if status changed
  if (lastStatus && lastStatus !== currentStatus) {
    logger.info(`Status change detected for site ${result.site_id}: ${lastStatus} -> ${currentStatus}`)

    // Send notification
    await sendStatusChangeNotification(result, lastStatus, currentStatus)
  } else if (!lastStatus) {
    logger.info(`First check for site ${result.site_id}: ${currentStatus}`)
  }
}

/**
 * Send email notification for status change
 */
async function sendStatusChangeNotification(result: MonitoringResult, lastStatus: string, currentStatus: string): Promise<void> {
  try {
    // Get site details
    const site = await findSiteById(result.site_id)
    if (!site || !site.user_id) {
      logger.error(`Site ${result.site_id} not found or has no user`)
      return
    }

    // Get user details
    const user = await findUserById(site.user_id)
    if (!user) {
      logger.error(`User ${site.user_id} not found`)
      return
    }

    if (!user.current_organization_id) {
      logger.error(`User ${site.user_id} has no current_organization_id`)
      return
    }

    // Check if user has monitoring alerts enabled
    const userNotifications = (await findUserNotificationByUserId(site.user_id, user.current_organization_id)) as { monitoring_alert_flag?: boolean } | null
    if (userNotifications && userNotifications.monitoring_alert_flag === false) {
      logger.info(`User ${user.id} has monitoring alerts disabled, skipping email`)
      return
    }

    const userEmail = user.email
    const userName = user.name || 'User'
    logger.info(`Sending monitoring notification to ${userEmail} for site ${result.url}`)

    // Compile and send email
    const templateName = currentStatus === 'down' ? 'siteDownAlert.mjml' : 'siteUpRecovery.mjml'

    const emailData = {
      name: userName,
      url: result.url || site.url,
      status_code: result.status_code || 'N/A',
      error: result.error || 'Connection failed',
      response_time: result.response_time_ms || 0,
      checked_at: new Date(result.checked_at).toLocaleString(),
      last_status: lastStatus,
      current_status: currentStatus,
      unsubscribeLink: generateSecureUnsubscribeLink(userEmail, getUnsubscribeTypeForEmail('monitoring'), user.id),
    }

    const emailHtml = await compileEmailTemplate({
      fileName: templateName,
      data: emailData,
    })

    const subject = currentStatus === 'down' ? `🔴 WebAbility Alert: ${result.url} is DOWN` : `✅ WebAbility Recovery: ${result.url} is back UP`

    const emailSent = await sendMail(userEmail, subject, emailHtml)

    if (emailSent) {
      logger.info(`✅ Email sent to ${userEmail} for site ${result.url}`)
    } else {
      logger.error(`❌ Failed to send email to ${userEmail}`)
    }
  } catch (error) {
    logger.error('Error sending notification:', error)
  }
}
