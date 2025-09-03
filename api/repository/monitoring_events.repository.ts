import database from '../config/database.config'
import { TABLES } from '../constants/database.constant'
import logger from '../utils/logger'

const TABLE = TABLES.monitoringEvents

export interface MonitoringEvent {
  id?: number
  site_id: number
  status: 'up' | 'down'
  status_code?: number
  response_time_ms?: number
  error_message?: string
  checked_at: Date | string
  notification_sent?: boolean
  created_at?: Date | string
}

export interface SiteMonitoringStatus {
  monitor_enabled?: boolean
  is_currently_down?: number  // 0 = up, 1 = down
  last_monitor_check?: Date | string
  monitor_consecutive_fails?: number
}

/**
 * Insert a new monitoring event
 */
export async function insertMonitoringEvent(event: MonitoringEvent): Promise<number> {
  try {
    const [id] = await database(TABLE).insert({
      site_id: event.site_id,
      status: event.status,
      status_code: event.status_code || null,
      response_time_ms: event.response_time_ms || null,
      error_message: event.error_message || null,
      checked_at: event.checked_at,
      notification_sent: event.notification_sent || false,
    })
    return id
  } catch (error: any) {
    // TESTING: If table doesn't exist, just log and return a dummy ID
    if (error.code === 'ER_NO_SUCH_TABLE') {
      logger.warn('TESTING: monitoring_events table does not exist, skipping insert')
      return 999 // Return dummy ID for testing
    }
    throw error
  }
}

/**
 * Get the last monitoring status for a site
 */
export async function getLastMonitoringStatus(siteId: number): Promise<MonitoringEvent | null> {
  try {
    const result = await database(TABLE)
      .where('site_id', siteId)
      .orderBy('checked_at', 'desc')
      .first()
    
    return result || null
  } catch (error: any) {
    // TESTING: If table doesn't exist, return null
    if (error.code === 'ER_NO_SUCH_TABLE') {
      logger.warn('TESTING: monitoring_events table does not exist')
      return null
    }
    throw error
  }
}

/**
 * Update site monitoring status in allowed_sites table
 */
export async function updateSiteMonitoringStatus(
  siteId: number,
  status: SiteMonitoringStatus
): Promise<void> {
  await database(TABLES.allowed_sites)
    .where('id', siteId)
    .update({
      is_currently_down: status.is_currently_down,
      last_monitor_check: status.last_monitor_check,
      monitor_consecutive_fails: status.monitor_consecutive_fails,
    })
}

/**
 * Get sites with monitoring enabled
 */
export async function getSitesWithMonitoringEnabled(): Promise<Array<{ id: number; url: string; user_id: number }>> {
  return database(TABLES.allowed_sites)
    .where('monitor_enabled', true)  // Changed from monitoring_enabled
    .where('status', 'Active')        // Only active sites
    .select('id', 'url', 'user_id')
}

/**
 * Update monitoring enabled status for a site
 */
export async function updateMonitoringEnabled(
  siteId: number,
  enabled: boolean
): Promise<void> {
  await database(TABLES.allowed_sites)
    .where('id', siteId)
    .update({ monitor_enabled: enabled })  // Changed to monitor_enabled
}

/**
 * Get monitoring history for a site
 */
export async function getMonitoringHistory(
  siteId: number,
  limit: number = 100
): Promise<MonitoringEvent[]> {
  return database(TABLE)
    .where('site_id', siteId)
    .orderBy('checked_at', 'desc')
    .limit(limit)
}

/**
 * Mark notification as sent
 */
export async function markNotificationSent(eventId: number): Promise<void> {
  await database(TABLE)
    .where('id', eventId)
    .update({ notification_sent: true })
}