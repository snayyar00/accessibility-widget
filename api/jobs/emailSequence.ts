import cron from 'node-cron'

import EmailDeliveryStatusService from '../services/email/emailDeliveryStatus.service'
import EmailSequenceService from '../services/email/emailSequence.service'
import logger from '../utils/logger'

/**
 * Email sequence fallback processor
 * Runs periodically to handle any failed or missed scheduled emails
 * This is now a lightweight fallback system since emails are scheduled at registration
 */
const processEmailSequences = async () => {
  try {
    logger.info('Starting email sequence fallback processing...')

    // Check delivery status of scheduled emails and update tracking
    await EmailDeliveryStatusService.syncDeliveryStatus()

    // Handle any failed scheduled emails and retry them
    await EmailSequenceService.handleFailedScheduledEmails()

    // Handle deferred emails (Day 7+) that couldn't be scheduled via Brevo
    await EmailSequenceService.processDailyEmailSequence()

    logger.info('Email sequence fallback processing completed')
  } catch (error) {
    logger.error('Error in email sequence fallback processing:', error)
  }
}

/**
 * Schedule the email sequence fallback job
 * Reduced frequency since emails are now scheduled at registration time
 */
const scheduleEmailSequences = () => {
  // Run delivery status checks every 30 minutes
  // This ensures sent-emails.json is updated promptly when emails are delivered
  cron.schedule(
    '*/30 * * * *',
    async () => {
      console.log('Running email delivery status check...')
      try {
        await EmailDeliveryStatusService.syncDeliveryStatus()
      } catch (error) {
        logger.error('Error in delivery status check:', error)
      }
    },
    {
      timezone: 'UTC',
    },
  )

  // Run full email sequence fallback every 6 hours
  // This handles missed emails and processes Day 7+ emails
  cron.schedule(
    '0 */6 * * *',
    async () => {
      console.log('Running email sequence fallback check...')
      await processEmailSequences()
    },
    {
      timezone: 'UTC',
    },
  )

  logger.info('Email delivery status check scheduled to run every 30 minutes')
  logger.info('Email sequence fallback job scheduled to run every 6 hours')
}

export { processEmailSequences, scheduleEmailSequences }
export default scheduleEmailSequences
