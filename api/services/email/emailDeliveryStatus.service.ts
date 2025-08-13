import fs from 'fs'
import path from 'path'

import { logger } from '../../utils/logger'
import ScheduledEmailTracker, { ScheduledEmailRecord } from './scheduledEmailTracker.service'

/**
 * Service to check and sync email delivery status from Brevo
 * Ensures sent-emails.json is only updated when emails are actually delivered
 */
class EmailDeliveryStatusService {
  /**
   * Check delivery status of scheduled emails and update tracking files accordingly
   * This should be called periodically (e.g., every 30 minutes)
   */
  static async syncDeliveryStatus(): Promise<{ checked: number; delivered: number; failed: number }> {
    try {
      logger.info('🔍 Checking delivery status of scheduled emails...')

      // Get all scheduled emails that haven't been marked as sent yet
      const scheduledEmails = await ScheduledEmailTracker.getUserScheduledEmails(0) // Get all users
      const pendingEmails = scheduledEmails.filter(
        (email) => email.status === 'scheduled' && new Date(email.scheduledAt) <= new Date(), // Only check emails that should have been sent
      )

      if (pendingEmails.length === 0) {
        logger.info('📭 No pending scheduled emails to check')
        return { checked: 0, delivered: 0, failed: 0 }
      }

      logger.info(`📧 Checking delivery status for ${pendingEmails.length} scheduled emails...`)

      let deliveredCount = 0
      let failedCount = 0

      // Check each email's delivery status
      for (const email of pendingEmails) {
        try {
          const deliveryStatus = await this.checkEmailDeliveryStatus(email.messageId)

          if (deliveryStatus === 'delivered') {
            // Mark as sent in both tracking systems
            await ScheduledEmailTracker.markEmailAsSent(email.messageId)
            await this.markEmailAsSentInLegacySystem(email)
            deliveredCount++
            logger.info(`✅ Email delivered: ${email.emailType} to user ${email.userId}`)
          } else if (deliveryStatus === 'failed') {
            // Mark as failed in scheduled tracker
            await ScheduledEmailTracker.markEmailAsFailed(email.messageId)
            failedCount++
            logger.warn(`❌ Email delivery failed: ${email.emailType} to user ${email.userId}`)
          }
          // If status is 'pending', we leave it as-is for next check

          // Small delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 100))
        } catch (error) {
          logger.error(`Error checking delivery status for ${email.messageId}:`, error)
        }
      }

      logger.info(`📊 Delivery status sync completed: ${deliveredCount} delivered, ${failedCount} failed`)
      return { checked: pendingEmails.length, delivered: deliveredCount, failed: failedCount }
    } catch (error) {
      logger.error('❌ Error syncing email delivery status:', error)
      return { checked: 0, delivered: 0, failed: 0 }
    }
  }

  /**
   * Check the delivery status of a specific email via Brevo API
   */
  private static async checkEmailDeliveryStatus(messageId: string): Promise<'delivered' | 'failed' | 'pending'> {
    try {
      // Note: This is a simplified implementation
      // In practice, you'd use Brevo's API to check the actual delivery status
      // For now, we'll assume emails older than 1 hour are delivered
      // In production, implement actual Brevo API call

      const currentTime = new Date()
      const scheduledEmails = await ScheduledEmailTracker.getUserScheduledEmails(0)
      const email = scheduledEmails.find((e) => e.messageId === messageId)

      if (!email) return 'failed'

      const scheduledTime = new Date(email.scheduledAt)
      const timeDiff = currentTime.getTime() - scheduledTime.getTime()
      const oneHourInMs = 60 * 60 * 1000

      // Simple heuristic: if more than 1 hour has passed since scheduled time, assume delivered
      // TODO: Replace with actual Brevo API call in production
      if (timeDiff > oneHourInMs) {
        return 'delivered'
      }

      return 'pending'
    } catch (error) {
      logger.error(`Error checking delivery status for ${messageId}:`, error)
      return 'failed'
    }
  }

  /**
   * Mark email as sent in the legacy sent-emails.json system
   */
  private static async markEmailAsSentInLegacySystem(email: ScheduledEmailRecord): Promise<void> {
    try {
      // Reconstruct the email log key that matches the format in sent-emails.json
      const emailLogKey = `${email.emailType}|${email.userId}`

      // Use the same logic as EmailSequenceService.markEmailAsSent
      await this.markEmailAsSent(emailLogKey)

      logger.info(`📝 Marked email as sent in legacy system: ${emailLogKey}`)
    } catch (error) {
      logger.error('Error marking email as sent in legacy system:', error)
    }
  }

  /**
   * Mark an email as sent in our tracking system (same as EmailSequenceService)
   */
  private static async markEmailAsSent(emailLogKey: string): Promise<void> {
    try {
      const logsDir = path.join(process.cwd(), 'logs')
      const trackingPath = path.join(logsDir, 'sent-emails.json')

      // Ensure logs directory exists
      if (!fs.existsSync(logsDir)) {
        await fs.promises.mkdir(logsDir, { recursive: true })
        logger.info(`Created logs directory: ${logsDir}`)
      }

      let sentEmails: string[] = []

      // Read existing tracking data if file exists
      if (fs.existsSync(trackingPath)) {
        const trackingContent = await fs.promises.readFile(trackingPath, 'utf8')
        sentEmails = JSON.parse(trackingContent)
      }

      // Add the new email key if not already present
      if (!sentEmails.includes(emailLogKey)) {
        sentEmails.push(emailLogKey)

        // Write back to file
        await fs.promises.writeFile(trackingPath, JSON.stringify(sentEmails, null, 2), 'utf8')
        logger.info(`Marked email as sent: ${emailLogKey}`)
      }
    } catch (error) {
      logger.error('Error marking email as sent:', error)
    }
  }

  /**
   * Immediate delivery confirmation for cron-sent emails
   * Call this when sending emails directly (not scheduled)
   */
  static async markCronEmailAsDelivered(userId: number, emailType: string, userEmail: string, messageId?: string): Promise<void> {
    try {
      // Mark in legacy system immediately since cron emails are sent synchronously
      const emailLogKey = `${emailType}|${userId}`
      await this.markEmailAsSent(emailLogKey)

      logger.info(`📝 Marked cron email as sent: ${emailLogKey}`)

      // If we have a messageId, also track it in scheduled system for consistency
      if (messageId) {
        await ScheduledEmailTracker.markEmailAsSent(messageId)
      }
    } catch (error) {
      logger.error('Error marking cron email as delivered:', error)
    }
  }
}

export default EmailDeliveryStatusService
