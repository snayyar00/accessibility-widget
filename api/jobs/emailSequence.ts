import cron from 'node-cron';
import EmailSequenceService from '../services/email/emailSequence.service';
import logger from '../utils/logger';

/**
 * Daily email sequence processor
 * Runs every day at 9:00 AM to send sequence emails to users
 */
const processEmailSequences = async () => {
  try {
    logger.info('Starting daily email sequence processing...');
    await EmailSequenceService.processDailyEmailSequence();
    logger.info('Daily email sequence processing completed.');
  } catch (error) {
    logger.error('Error in daily email sequence processing:', error);
  }
};

/**
 * Schedule the email sequence job to run daily at 9:00 AM
 */
const scheduleEmailSequences = () => {
  // Production: Run daily at 9:00 AM UTC for global consistency
  // This ensures emails are sent at the same absolute time regardless of server location
  cron.schedule('0 9 * * *', async () => {
    console.log('Running daily email sequence job at 9:00 AM UTC...');
    await processEmailSequences();
  }, {
    timezone: 'UTC'
  });
  
  logger.info('Email sequence job scheduled to run daily at 9:00 AM UTC');
};

export { processEmailSequences, scheduleEmailSequences };
export default scheduleEmailSequences;
