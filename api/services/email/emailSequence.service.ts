import fs from 'fs'
import path from 'path'

import { EMAIL_SEQUENCES, EmailSequenceStep } from '../../config/emailSequences.config'
import compileEmailTemplate from '../../helpers/compile-email-template'
import { isSubscribedToNewsletter } from '../../repository/newsletter_subscribers.repository'
import { getUsersRegisteredOnDate } from '../../repository/user.repository'
import { sendEmailWithRetries } from '../../services/email/email.service'
import logger from '../../utils/logger'

/**
 * Email Sequence Service - Production Ready
 *
 * This service handles the automated email sequence for new user onboarding.
 *
 * PRODUCTION FLOW:
 * - Day 0: Welcome email sent immediately on registration
 * - Days 1-90: Sequence emails sent daily via cron job at 9:00 AM
 * - Only subscribed users receive emails
 * - Duplicate prevention via JSON tracking
 *
 * TESTING UTILITIES:
 * - Testing methods are clearly separated and marked
 * - Use for development/testing purposes only
 */

export class EmailSequenceService {
  // ============================================================================
  // PRODUCTION METHODS
  // ============================================================================

  /**
   * Get email address for sending (Production)
   */
  private static getEmailForSending(userEmail: string): string {
    logger.info(`📧 Sending email to: ${userEmail}`)
    return userEmail
  }

  /**
   * Send welcome email immediately upon user registration (Production)
   */
  static async sendWelcomeEmail(userEmail: string, userName: string, userId: number): Promise<boolean> {
    try {
      // Check if user is subscribed to newsletter
      const isSubscribed = await isSubscribedToNewsletter(userEmail)
      if (!isSubscribed) {
        logger.info(`Skipping welcome email for user ${userId} - not subscribed to newsletter`)
        return false
      }

      const welcomeStep = EMAIL_SEQUENCES.ONBOARDING.steps[0] // Day 0 email

      // Check if email was already sent using log-based tracking
      const emailLogKey = `${welcomeStep.subject}|${userId}`
      if (await this.wasEmailAlreadySent(emailLogKey)) {
        logger.info(`Welcome email already sent to user ${userId}`)
        return true
      }

      // Extract first URL from comma-separated FRONTEND_URL
      const frontendUrl = process.env.FRONTEND_URL?.split(',')[0]?.trim() || 'http://localhost:3000'

      // Gmail-optimized logo approach
      // Gmail requires properly hosted images with specific characteristics
      const logoUrl = 'https://www.webability.io/images/logo.png'
      const fallbackLogoUrl = 'https://cdn.jsdelivr.net/gh/webability-io/assets/logo.png'

      // Additional fallback for maximum compatibility
      const altFallbackUrl = 'https://via.placeholder.com/150x40/1565C0/FFFFFF?text=WebAbility'

      try {
        const logoPath = path.join(process.cwd(), 'email-templates', 'logo.png')
        const logoBuffer = await fs.promises.readFile(logoPath)

        logger.info(`Logo setup - Primary: ${logoUrl}`)
        logger.info(`Logo setup - Fallback: ${fallbackLogoUrl}`)
        logger.info(`Logo setup - Alt fallback: ${altFallbackUrl}`)
        logger.info(`Local logo available (${logoBuffer.length} bytes)`)
      } catch (logoError) {
        logger.warn('Logo file issue, using hosted URLs only:', logoError.message)
      }

      // Compile the welcome email template
      const template = await compileEmailTemplate({
        fileName: welcomeStep.template,
        data: {
          name: userName,
          email: userEmail,
          logoUrl: logoUrl,
          fallbackLogoUrl: fallbackLogoUrl,
          altFallbackUrl: altFallbackUrl,
          installationGuide: 'https://www.webability.io/installation',
          dashboardLink: frontendUrl,
          supportLink: 'mailto:support@webability.io',
          unsubscribeLink: `${process.env.REACT_APP_BACKEND_URL}/unsubscribe?email=${encodeURIComponent(userEmail)}`,
          year: new Date().getFullYear(),
        },
      })

      // Send the email
      const emailToSend = this.getEmailForSending(userEmail)
      await sendEmailWithRetries(emailToSend, template, welcomeStep.subject)

      // Mark email as sent in tracking system
      await this.markEmailAsSent(emailLogKey)
      logger.info(`Welcome email sent successfully to user ${userId}`)

      return true
    } catch (error) {
      logger.error(`Failed to send welcome email to user ${userId}:`, error)
      return false
    }
  }

  /**
   * Process daily email sequence for all users (Production)
   * Processes users registered on specific dates and sends emails due today
   */
  static async processDailyEmailSequence(): Promise<void> {
    try {
      logger.info('🚀 Starting daily email sequence processing (Production Mode)')

      // Get all sequence steps (exclude Day 0 which is handled by welcome email)
      const sequenceSteps = EMAIL_SEQUENCES.ONBOARDING.steps.filter((step) => step.day > 0)

      // Use UTC date to ensure consistent behavior regardless of server timezone
      const currentDateUTC = new Date()
      currentDateUTC.setUTCHours(0, 0, 0, 0) // Set to start of day in UTC
      let totalEmailsSent = 0
      let totalUsersProcessed = 0

      // Process each sequence step to find users who should receive emails today
      for (const step of sequenceSteps) {
        // Calculate the registration date for users who should receive this email today
        // Using UTC to ensure global consistency
        const targetRegistrationDate = new Date(currentDateUTC)
        targetRegistrationDate.setUTCDate(currentDateUTC.getUTCDate() - step.day)
        const dateString = targetRegistrationDate.toISOString().split('T')[0] // YYYY-MM-DD format

        logger.info(`📅 Processing ${step.description} (Day ${step.day}) for users registered on ${dateString}`)

        // Get users registered on the target date
        const users = await getUsersRegisteredOnDate(dateString)

        if (users.length === 0) {
          logger.info(`   No users found registered on ${dateString}`)
          continue
        }

        logger.info(`   Found ${users.length} users registered on ${dateString}`)

        // Process each user for this step
        for (const user of users) {
          try {
            // Check if user is subscribed to newsletter
            const isSubscribed = await isSubscribedToNewsletter(user.email)
            if (!isSubscribed) {
              logger.info(`   Skipping user ${user.id} (${user.email}) - not subscribed to newsletter`)
              continue
            }

            // Check if email was already sent
            const emailLogKey = `${step.subject}|${user.id}`
            const alreadySent = await this.wasEmailAlreadySent(emailLogKey)

            if (alreadySent) {
              logger.info(`   Email already sent to user ${user.id} - ${step.description}`)
              continue
            }

            // Send the email
            logger.info(`   📤 Sending ${step.description} to ${user.email} (User ${user.id})`)
            await this.sendSequenceEmail(user, step)
            totalEmailsSent++

            // Small delay between emails to avoid overwhelming the email service
            await new Promise((resolve) => setTimeout(resolve, 500))
          } catch (error) {
            logger.error(`   ❌ Failed to process user ${user.id} for ${step.description}:`, error)
          }
        }

        totalUsersProcessed += users.length
      }

      logger.info(`📊 Daily email sequence processing completed:`)
      logger.info(`   📧 Total emails sent: ${totalEmailsSent}`)
      logger.info(`   👥 Total users processed: ${totalUsersProcessed}`)
    } catch (error) {
      logger.error('❌ Error in daily email sequence processing:', error)
    }
  }

  // ============================================================================
  // TESTING UTILITIES (Keep for development/testing purposes only)
  // ============================================================================

  /**
   * TESTING UTILITY: Process email sequence for a specific user
   * This method is kept for testing purposes only
   */
  static async processEmailSequenceForUser(userId: number): Promise<void> {
    try {
      // Get the specific user
      const { getUserbyId } = await import('../../repository/user.repository')
      const user = await getUserbyId(userId)

      if (!user) {
        logger.info(`User ${userId} not found for email sequence processing`)
        return
      }

      // Check if user is subscribed to newsletter
      const isSubscribed = await isSubscribedToNewsletter(user.email)
      if (!isSubscribed) {
        logger.info(`Skipping email sequence for user ${user.id} - not subscribed to newsletter`)
        return
      }

      // Calculate days since user registration
      const registrationDate = new Date(user.created_at)
      const currentDate = new Date()
      const daysSinceRegistration = Math.floor((currentDate.getTime() - registrationDate.getTime()) / (1000 * 60 * 60 * 24))

      logger.info(`🧪 TESTING: Processing email sequence for user ${user.id} (${daysSinceRegistration} days since registration)`)

      // Get all sequence steps (exclude Day 0 which is handled by welcome email)
      // For testing, we'll send ALL pending emails at once regardless of timing
      const sequenceSteps = EMAIL_SEQUENCES.ONBOARDING.steps.filter((step) => step.day > 0)

      const emailsToSend: EmailSequenceStep[] = []
      const allEmailsSent: EmailSequenceStep[] = []

      for (const step of sequenceSteps) {
        const emailLogKey = `${step.subject}|${user.id}`
        const alreadySent = await this.wasEmailAlreadySent(emailLogKey)

        if (alreadySent) {
          allEmailsSent.push(step)
        } else {
          // TESTING: Send all pending emails regardless of day interval
          emailsToSend.push(step)
        }
      }

      // Log current status
      logger.info(`📧 Email sequence status for user ${user.id}:`)
      logger.info(`   ✅ Already sent: ${allEmailsSent.length} emails`)
      logger.info(`   📤 Ready to send: ${emailsToSend.length} emails`)
      logger.info('   🧪 TESTING MODE: Sending all pending emails at once')

      // Check if all emails have been sent
      if (allEmailsSent.length === sequenceSteps.length) {
        logger.info(`✅ ALL SEQUENCE EMAILS COMPLETED! User ${user.id} has received all ${sequenceSteps.length} emails.`)
        return
      }

      // Send emails that are due
      let emailsSentThisRun = 0

      for (const step of emailsToSend) {
        logger.info(`📤 Sending: ${step.description} to ${user.email} (Day ${step.day})`)

        try {
          await this.sendSequenceEmail(user, step)
          emailsSentThisRun++

          // Add a small delay between emails
          if (emailsSentThisRun < emailsToSend.length) {
            await new Promise((resolve) => setTimeout(resolve, 1000))
          }
        } catch (error) {
          logger.error(`❌ Failed to send ${step.description}:`, error)
        }
      }

      logger.info(`📊 Testing email sequence completed. ${emailsSentThisRun} new emails sent to user ${user.id}.`)

      // Final status
      const finalSentCount = allEmailsSent.length + emailsSentThisRun
      if (finalSentCount === sequenceSteps.length) {
        logger.info(`🎉 TESTING COMPLETE! User ${user.id} has now received all ${sequenceSteps.length} emails in the sequence.`)
      }
    } catch (error) {
      logger.error(`Error in processEmailSequenceForUser for user ${userId}:`, error)
    }
  }

  /**
   * Send a specific sequence email to a user
   */
  private static async sendSequenceEmail(user: any, step: EmailSequenceStep): Promise<void> {
    try {
      // Check if user has active domains (for conditional content)
      const hasActiveDomains = await this.checkUserHasActiveDomains(user.id)
      console.log(`User ${user.id} has active domains: ${hasActiveDomains}`)

      // Extract first URL from comma-separated FRONTEND_URL
      const frontendUrl = process.env.FRONTEND_URL?.split(',')[0]?.trim() || 'http://localhost:3000'

      // Generate logo URL (same robust logic as welcome email)
      const logoUrl = 'https://www.webability.io/images/logo.png'
      const fallbackLogoUrl = 'https://cdn.jsdelivr.net/gh/webability-io/assets/logo.png'
      const altFallbackUrl = 'https://via.placeholder.com/150x40/1565C0/FFFFFF?text=WebAbility'

      try {
        const logoPath = path.join(process.cwd(), 'email-templates', 'logo.png')
        const _logoBuffer = await fs.promises.readFile(logoPath)

        logger.info(`Logo setup for ${step.description} - Primary: ${logoUrl}`)
      } catch (logoError) {
        logger.warn(`Logo file issue for ${step.description}, using hosted URLs only:`, logoError.message)
      }

      // Compile the email template
      const template = await compileEmailTemplate({
        fileName: step.template,
        data: {
          name: user.name,
          email: user.email,
          logoUrl: logoUrl,
          fallbackLogoUrl: fallbackLogoUrl,
          altFallbackUrl: altFallbackUrl,
          hasActiveDomains: hasActiveDomains,
          scannerLink: `${frontendUrl}/scanner`,
          dashboardLink: frontendUrl,
          customizeLink: `${frontendUrl}/customize-widget`,
          supportLink: 'mailto:support@webability.io',
          installationLink: `${frontendUrl}/installation`,
          installationGuide: 'https://www.webability.io/installation',
          unsubscribeLink: `${frontendUrl}/unsubscribe?email=${encodeURIComponent(user.email)}`,
          year: new Date().getFullYear(),
        },
      })

      // Compile subject line for conditional content (Day 1 email has Handlebars syntax)
      const compiledSubject = step.subject.includes('{{#if') ? (hasActiveDomains ? step.subject.replace(/{{#if hasActiveDomains}}(.*?){{else}}.*?{{\/if}}/g, '$1') : step.subject.replace(/{{#if hasActiveDomains}}.*?{{else}}(.*?){{\/if}}/g, '$1')) : step.subject

      // Send the email
      const emailToSend = this.getEmailForSending(user.email)
      await sendEmailWithRetries(emailToSend, template, compiledSubject)

      // Mark email as sent in tracking system
      const emailLogKey = `${step.subject}|${user.id}`
      await this.markEmailAsSent(emailLogKey)
      logger.info(`Email sent successfully: ${step.description} to user ${user.id}`)
    } catch (error) {
      logger.error(`Failed to send ${step.description} email to user ${user.id}:`, error)
    }
  }

  /**
   * Check if email was already sent using simple JSON tracking
   */
  private static async wasEmailAlreadySent(emailLogKey: string): Promise<boolean> {
    try {
      const logsDir = path.join(process.cwd(), 'logs')
      const trackingPath = path.join(logsDir, 'sent-emails.json')

      // Check if tracking file exists
      if (!fs.existsSync(trackingPath)) {
        return false
      }

      // Read the tracking file
      const trackingContent = await fs.promises.readFile(trackingPath, 'utf8')
      const sentEmails = JSON.parse(trackingContent)

      const wasAlreadySent = sentEmails.includes(emailLogKey)

      if (wasAlreadySent) {
        logger.info(`Email already sent - found in tracking: ${emailLogKey}`)
      }

      return wasAlreadySent
    } catch (error) {
      logger.error('Error checking email send status:', error)
      return false // Default to false on error to allow sending
    }
  }

  /**
   * Mark an email as sent in our tracking system
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
   * Check if user has any active domains/sites with WebAbility widget enabled
   */
  private static async checkUserHasActiveDomains(userId: number): Promise<boolean> {
    try {
      // Import here to avoid circular dependencies
      const { findSitesByUserId } = await import('../../repository/sites_allowed.repository')
      const sites = await findSitesByUserId(userId)

      if (sites.length === 0) {
        return false
      }

      // Check each site to see if WebAbility widget is enabled
      for (const site of sites) {
        if (site.url) {
          try {
            const widgetStatus = await this.checkScript(site.url)
            if (widgetStatus === 'Web Ability') {
              logger.info(`User ${userId} has active domain with widget: ${site.url}`)
              return true // Found at least one site with WebAbility widget enabled
            }
          } catch (error) {
            logger.warn(`Error checking widget for ${site.url}:`, error.message)
            // Continue checking other sites
          }
        }
      }

      logger.info(`User ${userId} has ${sites.length} sites but no WebAbility widgets enabled`)
      return false // No sites have WebAbility widget enabled
    } catch (error) {
      logger.error(`Error checking domains for user ${userId}:`, error)
      return false // Default to false on error
    }
  }

  /**
   * Check if WebAbility widget is enabled on a website
   * Adapted from accessibilityReport.service.ts
   */
  private static async checkScript(url: string, retries = 3): Promise<string> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const apiUrl = `${process.env.SECONDARY_SERVER_URL}/checkscript/?url=${url}`

        // Set up timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000)

        const response = await fetch(apiUrl, {
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          logger.warn(`Failed to fetch script check on attempt ${attempt} for ${url}. Status: ${response.status}`)
          if (attempt === retries) throw new Error(`Failed to fetch the script check. Status: ${response.status}`)
          // Wait before retrying (exponential backoff)
          await new Promise((resolve) => setTimeout(resolve, attempt * 1000))
          continue
        }

        const responseData = (await response.json()) as { result: string }

        if (responseData.result === 'WebAbility') {
          return 'Web Ability'
        } else if (responseData.result !== 'Not Found') {
          return 'true'
        } else {
          return 'false'
        }
      } catch (error) {
        logger.warn(`Error in checkScript attempt ${attempt} for ${url}:`, error.message)
        if (attempt === retries) return 'Error'
        // Wait before retrying (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000))
      }
    }
    return 'Error'
  }

  /**
   * TESTING UTILITY: Reset email tracking for a specific user
   * ⚠️  FOR TESTING PURPOSES ONLY - Use to reset email state during development
   */
  static async resetEmailTrackingForUser(userId: number): Promise<void> {
    try {
      const trackingPath = path.join(process.cwd(), 'logs', 'sent-emails.json')

      if (!fs.existsSync(trackingPath)) {
        logger.info('No email tracking file found to reset')
        return
      }

      const trackingContent = await fs.promises.readFile(trackingPath, 'utf8')
      const sentEmails = JSON.parse(trackingContent)

      // Remove all entries for this user
      const filteredEmails = sentEmails.filter((emailKey: string) => !emailKey.endsWith(`|${userId}`))

      await fs.promises.writeFile(trackingPath, JSON.stringify(filteredEmails, null, 2), 'utf8')
      logger.info(`Reset email tracking for user ${userId}. Removed ${sentEmails.length - filteredEmails.length} entries.`)
    } catch (error) {
      logger.error('Error resetting email tracking:', error)
    }
  }

  /**
   * TESTING UTILITY: Get email sequence status for a user
   * ⚠️  FOR TESTING PURPOSES ONLY - Use to check email sequence progress during development
   */
  static async getEmailSequenceStatus(userId: number): Promise<{ sent: number; total: number; pending: string[] }> {
    try {
      const sequenceSteps = EMAIL_SEQUENCES.ONBOARDING.steps
      let sentCount = 0
      const pendingEmails: string[] = []

      for (const step of sequenceSteps) {
        const emailLogKey = `${step.subject}|${userId}`
        const alreadySent = await this.wasEmailAlreadySent(emailLogKey)

        if (alreadySent) {
          sentCount++
        } else {
          pendingEmails.push(step.description)
        }
      }

      return {
        sent: sentCount,
        total: sequenceSteps.length,
        pending: pendingEmails,
      }
    } catch (error) {
      logger.error('Error getting email sequence status:', error)
      return { sent: 0, total: 0, pending: [] }
    }
  }
}

export default EmailSequenceService
