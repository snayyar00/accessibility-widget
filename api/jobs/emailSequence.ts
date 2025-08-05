import cron from 'node-cron'

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
  // Run every 6 hours instead of daily since we're now using Brevo scheduling
  // This is just for monitoring and handling any edge cases
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

  logger.info('Email sequence fallback job scheduled to run every 6 hours')
}

export { processEmailSequences, scheduleEmailSequences }
export default scheduleEmailSequences
