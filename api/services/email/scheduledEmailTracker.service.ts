import fs from 'fs'
import path from 'path'

import logger from '../../utils/logger'

interface ScheduledEmailRecord {
  userId: number
  emailType: string
  messageId: string
  batchId?: string
  scheduledAt: string
  userEmail: string
  sequenceDay: number
  status: 'scheduled' | 'sent' | 'cancelled' | 'failed'
  createdAt: string
}

/**
 * Scheduled Email Tracker Service
 * Manages tracking of scheduled emails for cancellation and monitoring
 */
export class ScheduledEmailTracker {
  private static getTrackingFilePath(): string {
    return path.join(process.cwd(), 'logs', 'scheduled-emails.json')
  }

  /**
   * Add a scheduled email record
   */
  static async addScheduledEmail(record: Omit<ScheduledEmailRecord, 'createdAt' | 'status'>): Promise<void> {
    try {
      const trackingPath = this.getTrackingFilePath()
      const logsDir = path.dirname(trackingPath)

      // Ensure logs directory exists
      if (!fs.existsSync(logsDir)) {
        await fs.promises.mkdir(logsDir, { recursive: true })
      }

      let scheduledEmails: ScheduledEmailRecord[] = []

      // Read existing data if file exists
      if (fs.existsSync(trackingPath)) {
        const trackingContent = await fs.promises.readFile(trackingPath, 'utf8')
        scheduledEmails = JSON.parse(trackingContent)
      }

      // Add new record
      const newRecord: ScheduledEmailRecord = {
        ...record,
        status: 'scheduled',
        createdAt: new Date().toISOString(),
      }

      scheduledEmails.push(newRecord)

      // Write back to file
      await fs.promises.writeFile(trackingPath, JSON.stringify(scheduledEmails, null, 2), 'utf8')
      logger.info(`Tracked scheduled email: ${record.emailType} for user ${record.userId} (messageId: ${record.messageId})`)
    } catch (error) {
      logger.error('Error adding scheduled email record:', error)
    }
  }

  /**
   * Cancel all scheduled emails for a user (when they unsubscribe)
   */
  static async cancelUserScheduledEmails(userId: number): Promise<number> {
    try {
      const trackingPath = this.getTrackingFilePath()

      if (!fs.existsSync(trackingPath)) {
        return 0
      }

      const trackingContent = await fs.promises.readFile(trackingPath, 'utf8')
      const scheduledEmails: ScheduledEmailRecord[] = JSON.parse(trackingContent)

      // Find scheduled emails for this user
      const userScheduledEmails = scheduledEmails.filter((email) => email.userId === userId && email.status === 'scheduled')

      if (userScheduledEmails.length === 0) {
        logger.info(`No scheduled emails found for user ${userId}`)
        return 0
      }

      // Cancel each scheduled email via Brevo API
      const { cancelScheduledEmail } = await import('./email.service')
      let cancelledCount = 0

      for (const emailRecord of userScheduledEmails) {
        try {
          const cancelled = await cancelScheduledEmail(emailRecord.messageId)
          if (cancelled) {
            // Update status in our tracking
            emailRecord.status = 'cancelled'
            cancelledCount++
            logger.info(`Cancelled scheduled email: ${emailRecord.emailType} for user ${userId}`)
          }
        } catch (error) {
          logger.error(`Failed to cancel scheduled email ${emailRecord.messageId}:`, error)
        }
      }

      // Update the tracking file
      await fs.promises.writeFile(trackingPath, JSON.stringify(scheduledEmails, null, 2), 'utf8')

      logger.info(`Cancelled ${cancelledCount} scheduled emails for user ${userId}`)
      return cancelledCount
    } catch (error) {
      logger.error('Error cancelling user scheduled emails:', error)
      return 0
    }
  }

  /**
   * Mark an email as sent (when we receive confirmation)
   */
  static async markEmailAsSent(messageId: string): Promise<void> {
    try {
      const trackingPath = this.getTrackingFilePath()

      if (!fs.existsSync(trackingPath)) {
        return
      }

      const trackingContent = await fs.promises.readFile(trackingPath, 'utf8')
      const scheduledEmails: ScheduledEmailRecord[] = JSON.parse(trackingContent)

      // Find and update the email record
      const emailRecord = scheduledEmails.find((email) => email.messageId === messageId)
      if (emailRecord) {
        emailRecord.status = 'sent'
        await fs.promises.writeFile(trackingPath, JSON.stringify(scheduledEmails, null, 2), 'utf8')
        logger.info(`Marked email as sent: ${messageId}`)
      }
    } catch (error) {
      logger.error('Error marking email as sent:', error)
    }
  }

  /**
   * Get scheduled emails for a user (for monitoring/debugging)
   */
  static async getUserScheduledEmails(userId: number): Promise<ScheduledEmailRecord[]> {
    try {
      const trackingPath = this.getTrackingFilePath()

      if (!fs.existsSync(trackingPath)) {
        return []
      }

      const trackingContent = await fs.promises.readFile(trackingPath, 'utf8')
      const scheduledEmails: ScheduledEmailRecord[] = JSON.parse(trackingContent)

      return scheduledEmails.filter((email) => email.userId === userId)
    } catch (error) {
      logger.error('Error getting user scheduled emails:', error)
      return []
    }
  }

  /**
   * Get cancelled emails for a user (for recovery purposes)
   */
  static async getCancelledEmailsForUser(userId: number): Promise<ScheduledEmailRecord[]> {
    try {
      const trackingPath = this.getTrackingFilePath()

      if (!fs.existsSync(trackingPath)) {
        return []
      }

      const trackingContent = await fs.promises.readFile(trackingPath, 'utf8')
      const scheduledEmails: ScheduledEmailRecord[] = JSON.parse(trackingContent)

      return scheduledEmails.filter((email) => email.userId === userId && email.status === 'cancelled')
    } catch (error) {
      logger.error('Error getting cancelled emails for user:', error)
      return []
    }
  }

  /**
   * Check if an email is already scheduled for a user (duplicate prevention)
   */
  static async isEmailAlreadyScheduled(userId: number, emailType: string): Promise<boolean> {
    try {
      const trackingPath = this.getTrackingFilePath()

      if (!fs.existsSync(trackingPath)) {
        return false
      }

      const trackingContent = await fs.promises.readFile(trackingPath, 'utf8')
      const scheduledEmails: ScheduledEmailRecord[] = JSON.parse(trackingContent)

      // Check if there's an active scheduled email (not cancelled)
      return scheduledEmails.some((email) => email.userId === userId && email.emailType === emailType && email.status !== 'cancelled')
    } catch (error) {
      logger.error('Error checking if email is already scheduled:', error)
      return false
    }
  }

  /**
   * Check if an email is already scheduled for a user on a specific date (prevents same-day duplicates)
   */
  static async isEmailScheduledForDate(userId: number, emailType: string, targetDate: Date): Promise<boolean> {
    try {
      const trackingPath = this.getTrackingFilePath()

      if (!fs.existsSync(trackingPath)) {
        return false
      }

      const trackingContent = await fs.promises.readFile(trackingPath, 'utf8')
      const scheduledEmails: ScheduledEmailRecord[] = JSON.parse(trackingContent)

      // Check if there's a scheduled email for the same user, email type, and date
      return scheduledEmails.some((email) => {
        if (email.userId !== userId || email.emailType !== emailType || email.status === 'cancelled') {
          return false
        }

        // Compare dates (ignore time)
        const emailDate = new Date(email.scheduledAt)
        const targetDateOnly = new Date(targetDate)

        // Set time to 00:00:00 for date-only comparison
        emailDate.setHours(0, 0, 0, 0)
        targetDateOnly.setHours(0, 0, 0, 0)

        return emailDate.getTime() === targetDateOnly.getTime()
      })
    } catch (error) {
      logger.error('Error checking if email is scheduled for date:', error)
      return false
    }
  }

  /**
   * Mark an email as failed in the tracking system
   */
  static async markEmailAsFailed(messageId: string): Promise<void> {
    try {
      const trackingPath = this.getTrackingFilePath()

      if (!fs.existsSync(trackingPath)) {
        return
      }

      const trackingContent = await fs.promises.readFile(trackingPath, 'utf8')
      const scheduledEmails: ScheduledEmailRecord[] = JSON.parse(trackingContent)

      // Find and update the email record
      const emailRecord = scheduledEmails.find((email) => email.messageId === messageId)
      if (emailRecord) {
        emailRecord.status = 'failed'
        await fs.promises.writeFile(trackingPath, JSON.stringify(scheduledEmails, null, 2), 'utf8')
        logger.info(`Marked email as failed: ${messageId}`)
      }
    } catch (error) {
      logger.error('Error marking email as failed:', error)
    }
  }

  /**
   * Clean up old email records (optional maintenance)
   */
  static async cleanupOldRecords(daysOld = 90): Promise<void> {
    try {
      const trackingPath = this.getTrackingFilePath()

      if (!fs.existsSync(trackingPath)) {
        return
      }

      const trackingContent = await fs.promises.readFile(trackingPath, 'utf8')
      const scheduledEmails: ScheduledEmailRecord[] = JSON.parse(trackingContent)

      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysOld)

      const filteredEmails = scheduledEmails.filter((email) => {
        const emailDate = new Date(email.createdAt)
        return emailDate > cutoffDate
      })

      await fs.promises.writeFile(trackingPath, JSON.stringify(filteredEmails, null, 2), 'utf8')
      logger.info(`Cleaned up ${scheduledEmails.length - filteredEmails.length} old email records`)
    } catch (error) {
      logger.error('Error cleaning up old email records:', error)
    }
  }
}

export default ScheduledEmailTracker
export type { ScheduledEmailRecord }
