import fs from 'fs'
import path from 'path'

import { EMAIL_SEQUENCES, EmailSequenceStep } from '../../config/emailSequences.config'
import compileEmailTemplate from '../../helpers/compile-email-template'
import { checkOnboardingEmailsEnabled, getUserbyId, getUsersRegisteredOnDate, UserProfile } from '../../repository/user.repository'
import { sendEmailWithRetries } from '../../services/email/email.service'
import logger from '../../utils/logger'
import { generateSecureUnsubscribeLink, getUnsubscribeTypeForEmail } from '../../utils/secure-unsubscribe.utils'

/**
 * Email Sequence Service - Immediate Sending with Database Tracking
 *
 * This service handles the automated email sequence for new user onboarding.
 *
 * PRODUCTION FLOW:
 * - Day 0: Welcome email sent immediately on registration
 * - Days 1-90: Emails sent immediately by cron job with gap enforcement
 * - All emails tracked in database JSON column (user_notifications.sent_emails)
 * - Only users registered on/after August 14, 2025 receive sequence emails
 * - Proper gap enforcement ensures correct timing between emails
 * - No volatile file tracking - everything persisted in database
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
      // Email sequence kill switch for staging
      if (process.env.DISABLE_EMAIL_SEQUENCE === 'true') {
        logger.info(`Email sequence disabled via DISABLE_EMAIL_SEQUENCE env var - skipping welcome email for user ${userId}`)
        return true // Return true to not break the registration flow
      }

      // Check if user has onboarding emails enabled
      const isOnboardingEnabled = await checkOnboardingEmailsEnabled(userId)
      if (!isOnboardingEnabled) {
        logger.info(`Skipping welcome email for user ${userId} - onboarding emails disabled`)
        return false
      }

      const welcomeStep = EMAIL_SEQUENCES.ONBOARDING.steps[0] // Day 0 email

      // Check if email was already sent using database tracking
      if (await this.wasEmailAlreadySent(userId, welcomeStep.day)) {
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
          unsubscribeLink: generateSecureUnsubscribeLink(userEmail, 'onboarding', userId),
          year: new Date().getFullYear(),
        },
      })

      // Send the email
      const emailToSend = this.getEmailForSending(userEmail)
      await sendEmailWithRetries(emailToSend, template, welcomeStep.subject)

      // Mark email as sent in tracking system
      await this.markEmailAsSent(userId, welcomeStep.day)
      logger.info(`Welcome email sent successfully to user ${userId}`)

      return true
    } catch (error) {
      logger.error(`Failed to send welcome email to user ${userId}:`, error)
      return false
    }
  }

  /**
   * Enhanced daily email sequence processing (Production)
   * Now uses database tracking with gap enforcement for new users only
   */
  static async processDailyEmailSequence(): Promise<void> {
    try {
      // Email sequence kill switch for staging
      if (process.env.DISABLE_EMAIL_SEQUENCE === 'true') {
        logger.info(`Email sequence disabled via DISABLE_EMAIL_SEQUENCE env var - skipping daily processing`)
        return
      }

      logger.info('🚀 Starting enhanced daily email sequence processing')

      // Get all sequence steps (exclude Day 0 which is handled by welcome email)
      const sequenceSteps = EMAIL_SEQUENCES.ONBOARDING.steps.filter((step) => step.day > 0)

      let totalEmailsSent = 0
      let totalUsersProcessed = 0

      // Get users registered on or after August 14, 2025 (new users only)
      const cutoffDate = new Date('2025-08-14')
      cutoffDate.setHours(0, 0, 0, 0)
      const currentDate = new Date()

      // For daily processing, we check users who might have emails due today
      // We need to check multiple registration dates based on email sequence days
      const emailSequenceDays = EMAIL_SEQUENCES.ONBOARDING.steps.map((step) => step.day).filter((day) => day > 0)
      const _maxSequenceDay = Math.max(...emailSequenceDays)

      let allEligibleUsers: UserProfile[] = []

      // Check users registered on dates that could have emails due today
      for (const sequenceDay of emailSequenceDays) {
        const targetRegistrationDate = new Date(currentDate)
        targetRegistrationDate.setDate(currentDate.getDate() - sequenceDay)

        // Only check dates on or after the cutoff
        if (targetRegistrationDate >= cutoffDate) {
          const dateString = targetRegistrationDate.toISOString().split('T')[0]
          const usersFromDate = await getUsersRegisteredOnDate(dateString)

          if (usersFromDate.length > 0) {
            logger.info(`Found ${usersFromDate.length} users registered on ${dateString} (Day ${sequenceDay} emails due)`)
            allEligibleUsers = allEligibleUsers.concat(usersFromDate)
          }
        }
      }

      // Remove duplicates (users might appear multiple times if they have multiple emails due)
      const uniqueUsers = allEligibleUsers.filter((user, index, self) => index === self.findIndex((u) => u.id === user.id))

      logger.info(`Found ${uniqueUsers.length} unique users with potential emails due today`)
      logger.info(`Total user instances across all dates: ${allEligibleUsers.length}`)

      for (const user of uniqueUsers) {
        totalUsersProcessed++

        // Check if user has onboarding emails enabled
        const isOnboardingEnabled = await checkOnboardingEmailsEnabled(user.id)
        if (!isOnboardingEnabled) {
          logger.info(`Skipping user ${user.id} - onboarding emails disabled`)
          continue
        }

        const registrationDate = new Date(user.created_at)

        // Process each sequence step for this user
        for (const step of sequenceSteps) {
          const shouldSend = await this.shouldSendEmail(user.id, step.day, registrationDate)

          if (shouldSend.should) {
            try {
              await this.sendSequenceEmail(user, step)
              await this.markEmailAsSent(user.id, step.day)
              totalEmailsSent++
              logger.info(`✅ Sent Day ${step.day} email to user ${user.id}: ${step.description}`)
            } catch (error) {
              logger.error(`❌ Failed to send Day ${step.day} email to user ${user.id}:`, error)
            }
          } else {
            logger.info(`⏭️  Skipping Day ${step.day} for user ${user.id}: ${shouldSend.reason}`)
          }
        }
      }

      logger.info(`📊 Enhanced daily email sequence processing completed:`)
      logger.info(`   📧 Total emails sent: ${totalEmailsSent}`)
      logger.info(`   👥 Total users processed: ${totalUsersProcessed}`)
      logger.info(`   📅 Checked users with emails potentially due today`)
    } catch (error) {
      logger.error('❌ Error in enhanced daily email sequence processing:', error)
    }
  }

  /**
   * Recovery mechanism for users who re-enable onboarding emails
   * Only applies to users registered on or after August 14, 2025, with proper gap enforcement
   */

  /**
   * Recovery mechanism for users who re-enable onboarding emails
   * Only applies to users registered today and beyond, with proper gap enforcement
   */
  static async recoverMissedEmailsForUser(userId: number): Promise<{ recovered: number; details: string[] }> {
    try {
      logger.info(`🔄 Starting email recovery for user ${userId}`)

      // Check if user has onboarding emails enabled
      const isOnboardingEnabled = await checkOnboardingEmailsEnabled(userId)
      if (!isOnboardingEnabled) {
        logger.info(`User ${userId} has onboarding emails disabled - skipping recovery`)
        return { recovered: 0, details: ['Onboarding emails disabled'] }
      }

      // Get user details
      const user = await getUserbyId(userId)

      if (!user) {
        logger.info(`User ${userId} not found`)
        return { recovered: 0, details: ['User not found'] }
      }

      const registrationDate = new Date(user.created_at)

      // Check if user registered on or after August 14, 2025 (new users only)
      const cutoffDate = new Date('2025-08-14')
      cutoffDate.setHours(0, 0, 0, 0)
      const regDate = new Date(registrationDate)
      regDate.setHours(0, 0, 0, 0)

      if (regDate < cutoffDate) {
        logger.info(`User ${userId} registered before August 14, 2025 - recovery only applies to new users`)
        return { recovered: 0, details: ['Recovery only applies to users registered on or after August 14, 2025'] }
      }

      const daysSinceRegistration = this.calculateDaysSinceRegistration(registrationDate)
      logger.info(`User ${userId} registered ${daysSinceRegistration} days ago`)

      // Get all sequence steps
      const allSteps = EMAIL_SEQUENCES.ONBOARDING.steps
      let recoveredCount = 0
      const recoveryDetails: string[] = []

      // Check each step to see if it should be sent (with gap enforcement)
      for (const step of allSteps) {
        const shouldSend = await this.shouldSendEmail(userId, step.day, registrationDate)

        if (shouldSend.should) {
          try {
            logger.info(`   📧 Sending missing email: ${step.description} (Day ${step.day})`)
            await this.sendSequenceEmail(user, step)
            await this.markEmailAsSent(userId, step.day)
            recoveredCount++
            recoveryDetails.push(`Sent: ${step.description} (Day ${step.day})`)
          } catch (error) {
            logger.error(`   ❌ Failed to send ${step.description}:`, error)
            recoveryDetails.push(`Failed: ${step.description} (Day ${step.day}) - ${error.message}`)
          }
        } else {
          logger.info(`   ⏭️  Skipping ${step.description} (Day ${step.day}): ${shouldSend.reason}`)
          recoveryDetails.push(`Skipped: ${step.description} (Day ${step.day}) - ${shouldSend.reason}`)
        }
      }

      logger.info(`📊 Email recovery completed for user ${userId}: ${recoveredCount} emails recovered`)
      return { recovered: recoveredCount, details: recoveryDetails }
    } catch (error) {
      logger.error(`❌ Error in email recovery for user ${userId}:`, error)
      return { recovered: 0, details: [`Error: ${error.message}`] }
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
      const user = await getUserbyId(userId)

      if (!user) {
        logger.info(`User ${userId} not found for email sequence processing`)
        return
      }

      // Check if user has onboarding emails enabled
      const isOnboardingEnabled = await checkOnboardingEmailsEnabled(user.id)
      if (!isOnboardingEnabled) {
        logger.info(`Skipping email sequence for user ${user.id} - onboarding emails disabled`)
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
        const alreadySent = await this.wasEmailAlreadySent(user.id, step.day)

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
  private static async sendSequenceEmail(user: UserProfile, step: EmailSequenceStep): Promise<void> {
    try {
      // Check if user has active domains (for conditional content)
      const hasActiveDomains = await this.checkUserHasActiveDomains(user.id)

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
          unsubscribeLink: generateSecureUnsubscribeLink(user.email, 'onboarding', user.id),
          year: new Date().getFullYear(),
        },
      })

      // Compile subject line for conditional content (Day 1 email has Handlebars syntax)
      const compiledSubject = step.subject.includes('{{#if') ? (hasActiveDomains ? step.subject.replace(/{{#if hasActiveDomains}}(.*?){{else}}.*?{{\/if}}/g, '$1') : step.subject.replace(/{{#if hasActiveDomains}}.*?{{else}}(.*?){{\/if}}/g, '$1')) : step.subject

      // Send the email
      const emailToSend = this.getEmailForSending(user.email)
      await sendEmailWithRetries(emailToSend, template, compiledSubject)

      // Mark email as sent in tracking system
      await this.markEmailAsSent(user.id, step.day)
      logger.info(`Email sent successfully: ${step.description} to user ${user.id}`)
    } catch (error) {
      logger.error(`Failed to send ${step.description} email to user ${user.id}:`, error)
    }
  }

  /**
   * Check if email was already sent using database JSON tracking
   */
  private static async wasEmailAlreadySent(userId: number, sequenceDay: number): Promise<boolean> {
    try {
      const { getUserSentEmails } = await import('../../repository/user.repository')
      const sentEmails = await getUserSentEmails(userId)

      if (!sentEmails) return false

      return sentEmails[sequenceDay.toString()] !== undefined
    } catch (error) {
      logger.error('Error checking if email was sent:', error)
      return false
    }
  }

  /**
   * Mark an email as sent in database tracking system
   */
  private static async markEmailAsSent(userId: number, sequenceDay: number): Promise<void> {
    try {
      const { getUserSentEmails, updateUserSentEmails } = await import('../../repository/user.repository')

      const sentEmails = (await getUserSentEmails(userId)) || {}
      sentEmails[sequenceDay.toString()] = new Date().toISOString()

      await updateUserSentEmails(userId, sentEmails)
      logger.info(`Marked email as sent: Day ${sequenceDay} for user ${userId}`)
    } catch (error) {
      logger.error('Error marking email as sent:', error)
    }
  }

  /**
   * Calculate days since registration for gap enforcement
   */
  private static calculateDaysSinceRegistration(registrationDate: Date): number {
    const currentDate = new Date()
    const timeDiff = currentDate.getTime() - registrationDate.getTime()
    return Math.floor(timeDiff / (1000 * 60 * 60 * 24))
  }

  /**
   * Check if user should receive email (new users only + gap enforcement)
   */
  private static async shouldSendEmail(userId: number, sequenceDay: number, registrationDate: Date): Promise<{ should: boolean; reason: string }> {
    try {
      // Check if user registered on or after August 14, 2025 (new users only)
      const cutoffDate = new Date('2025-08-14')
      cutoffDate.setHours(0, 0, 0, 0)
      const regDate = new Date(registrationDate)
      regDate.setHours(0, 0, 0, 0)

      if (regDate < cutoffDate) {
        return { should: false, reason: 'Only applies to users registered on or after August 14, 2025' }
      }

      // Check if email already sent
      if (await this.wasEmailAlreadySent(userId, sequenceDay)) {
        return { should: false, reason: 'Email already sent' }
      }

      // Check gap enforcement
      const daysSinceRegistration = this.calculateDaysSinceRegistration(registrationDate)
      if (daysSinceRegistration < sequenceDay) {
        return { should: false, reason: `Gap not met: ${daysSinceRegistration} days < ${sequenceDay} days required` }
      }

      return { should: true, reason: 'Ready to send' }
    } catch (error) {
      logger.error('Error checking if should send email:', error)
      return { should: false, reason: 'Error occurred' }
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
      const { resetUserEmailTracking } = await import('../../repository/user.repository')
      await resetUserEmailTracking(userId)
      logger.info(`🔄 Reset email tracking for user ${userId}`)
    } catch (error) {
      logger.error(`Error resetting email tracking for user ${userId}:`, error)
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
        const alreadySent = await this.wasEmailAlreadySent(userId, step.day)

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
