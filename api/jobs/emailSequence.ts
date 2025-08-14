import cron from 'node-cron'

import EmailSequenceService from '../services/email/emailSequence.service'
import logger from '../utils/logger'

/**
 * Email sequence processor - simplified immediate sending approach
 * Handles all email sequence steps via daily cron job with database tracking
 */
const processEmailSequences = async () => {
  try {
    logger.info('Starting email sequence processing...')

    // Process all pending emails for eligible users
    await EmailSequenceService.processDailyEmailSequence()

    logger.info('Email sequence processing completed')
  } catch (error) {
    logger.error('Error in email sequence processing:', error)
  }
}

/**
 * Schedule the email sequence job - daily processing only
 */
const scheduleEmailSequences = () => {
  // Run email sequence processing every 6 hours
  // This handles all email steps with immediate sending and database tracking
  cron.schedule(
    '0 */6 * * *',
    async () => {
      console.log('Running email sequence processing...')
      await processEmailSequences()
    },
    {
      timezone: 'UTC',
    },
  )

  logger.info('Email sequence job scheduled to run every 6 hours')
}

export { processEmailSequences, scheduleEmailSequences }
export default scheduleEmailSequences
