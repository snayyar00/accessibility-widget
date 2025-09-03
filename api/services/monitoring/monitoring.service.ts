import { sendMail } from '../email/email.service'
import compileEmailTemplate from '../../helpers/compile-email-template'
import {
  insertMonitoringEvent,
  getLastMonitoringStatus,
  updateSiteMonitoringStatus,
  getSitesWithMonitoringEnabled,
  markNotificationSent,
  MonitoringEvent,
} from '../../repository/monitoring_events.repository'
import { findSiteById } from '../../repository/sites_allowed.repository'
import { findUserById, findUserNotificationByUserId } from '../../repository/user.repository'
import logger from '../../utils/logger'

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

/**
 * Process a batch of monitoring results
 */
export async function processMonitoringBatch(batch: MonitoringBatch): Promise<void> {
  logger.info(`Processing monitoring batch ${batch.batch_id} with ${batch.results.length} results`)

  // TESTING: Skip monitoring enabled check for now (column doesn't exist yet)
  // const monitoringEnabledSites = await getSitesWithMonitoringEnabled()
  // const enabledSiteIds = new Set(monitoringEnabledSites.map(site => site.id))

  for (const result of batch.results) {
    try {
      // TESTING: Process all sites for now
      // if (!enabledSiteIds.has(result.site_id)) {
      //   logger.debug(`Monitoring not enabled for site ${result.site_id}`)
      //   continue
      // }

      await processSingleMonitoringResult(result)
    } catch (error) {
      logger.error(`Error processing monitoring result for site ${result.site_id}:`, error)
    }
  }
}

/**
 * Process a single monitoring result
 */
async function processSingleMonitoringResult(result: MonitoringResult): Promise<void> {
  const currentStatus = result.is_down ? 'down' : 'up'
  
  // Get the last known status
  const lastEvent = await getLastMonitoringStatus(result.site_id)
  const lastStatus = lastEvent?.status
  
  // Create monitoring event
  const eventId = await insertMonitoringEvent({
    site_id: result.site_id,
    status: currentStatus,
    status_code: result.status_code,
    response_time_ms: result.response_time_ms,
    error_message: result.error,
    checked_at: result.checked_at,
    notification_sent: false,
  })

  // Update site monitoring status (0 = up, 1 = down)
  await updateSiteMonitoringStatus(result.site_id, {
    is_currently_down: result.is_down ? 1 : 0,  // Convert to numeric: 0=up, 1=down
    last_monitor_check: result.checked_at,
    monitor_consecutive_fails: result.is_down 
      ? (lastEvent && lastEvent.status === 'down' ? 1 : 0) + 1
      : 0,
  })

  // Check if status changed
  if (lastStatus && lastStatus !== currentStatus) {
    logger.info(`Status change detected for site ${result.site_id}: ${lastStatus} -> ${currentStatus}`)
    
    // Send notification
    await sendStatusChangeNotification(result, lastStatus, currentStatus, eventId)
  }
}

/**
 * Send email notification for status change
 */
async function sendStatusChangeNotification(
  result: MonitoringResult,
  lastStatus: string,
  currentStatus: string,
  eventId: number
): Promise<void> {
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

    // Check if user has monitoring alerts enabled
    const userNotifications = await findUserNotificationByUserId(user.id) as { monitoring_alert_flag?: boolean } | null
    if (userNotifications && userNotifications.monitoring_alert_flag === false) {
      logger.info(`User ${user.id} has monitoring alerts disabled, skipping email`)
      return
    }

    const userEmail = user.email
    const userName = user.name || 'User'

    // Compile and send email
    const templateName = currentStatus === 'down' ? 'siteDownAlert.mjml' : 'siteUpRecovery.mjml'
    
    const emailData = {
      name: userName,
      url: result.url,
      status_code: result.status_code || 'N/A',
      error: result.error || 'Connection failed',
      response_time: result.response_time_ms || 0,
      checked_at: new Date(result.checked_at).toLocaleString(),
      last_status: lastStatus,
      current_status: currentStatus,
      unsubscribeLink: `${process.env.REACT_APP_BACKEND_URL}/unsubscribe?email=${encodeURIComponent(userEmail)}&type=monitoring`,
    }

    const emailHtml = await compileEmailTemplate({
      fileName: templateName,
      data: emailData,
    })

    const subject = currentStatus === 'down' 
      ? `🔴 Alert: ${result.url} is DOWN`
      : `✅ Recovery: ${result.url} is back UP`

    // Send email
    const emailSent = await sendMail(userEmail, subject, emailHtml)
    
    if (emailSent) {
      await markNotificationSent(eventId)
      logger.info(`Notification sent to ${userEmail} for site ${result.url}`)
    } else {
      logger.error(`Failed to send notification to ${userEmail}`)
    }
  } catch (error) {
    logger.error('Error sending status change notification:', error)
  }
}

/**
 * Toggle monitoring for a site
 */
export async function toggleSiteMonitoring(
  siteId: number,
  enabled: boolean,
  userId: number
): Promise<boolean> {
  try {
    // Verify site ownership
    const site = await findSiteById(siteId)
    if (!site || site.user_id !== userId) {
      throw new Error('Site not found or unauthorized')
    }

    // Update monitoring status in database
    await updateMonitoringEnabled(siteId, enabled)
    
    logger.info(`Monitoring ${enabled ? 'enabled' : 'disabled'} for site ${siteId}`)
    return true
  } catch (error) {
    logger.error('Error toggling site monitoring:', error)
    throw error
  }
}

/**
 * Get monitoring status for a site
 */
export async function getSiteMonitoringStatus(siteId: number): Promise<any> {
  const site = await findSiteById(siteId)
  const lastEvent = await getLastMonitoringStatus(siteId)
  
  return {
    monitoring_enabled: site?.monitoring_enabled || false,
    last_status: site?.last_monitoring_status || null,
    last_check: site?.last_monitoring_check || null,
    consecutive_failures: site?.monitoring_consecutive_failures || 0,
    last_event: lastEvent,
  }
}

// Import this function from repository
import { updateMonitoringEnabled } from '../../repository/monitoring_events.repository'