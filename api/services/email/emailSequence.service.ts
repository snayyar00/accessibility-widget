import fs from 'fs'
import path from 'path'

import { EMAIL_SEQUENCES, EmailSequenceStep } from '../../config/emailSequences.config'
import compileEmailTemplate from '../../helpers/compile-email-template'
import { checkOnboardingEmailsEnabled, UserProfile } from '../../repository/user.repository'
import { getUsersRegisteredOnDate } from '../../repository/user.repository'
import { sendEmailWithRetries, sendScheduledEmail } from '../../services/email/email.service'
import ScheduledEmailTracker, { ScheduledEmailRecord } from '../../services/email/scheduledEmailTracker.service'
import logger from '../../utils/logger'

/**
 * Email Sequence Service - Production Ready
 *
 * This service handles the automated email sequence for new user onboarding.
 *
 * PRODUCTION FLOW:
 * - Day 0: Welcome email sent immediately on registration
 * - Days 1-90: Sequence emails scheduled at registration time using Brevo scheduling
 * - Emails sent at 24-hour intervals from registration time
 * - Only subscribed users receive emails
 * - Scheduled emails can be cancelled when users unsubscribe
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
   * Enhanced daily email sequence processing (Production)
   * Now handles BOTH deferred emails (Day 7+) AND failed immediate emails
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

      // Use UTC date to ensure consistent behavior regardless of server timezone
      const currentDateUTC = new Date()
      currentDateUTC.setUTCHours(0, 0, 0, 0)
      let totalEmailsSent = 0
      let totalUsersProcessed = 0

      // Process each sequence step to find users who should receive emails today
      for (const step of sequenceSteps) {
        // Calculate the registration date for users who should receive this email today
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
            // Check if user has onboarding emails enabled
            const isOnboardingEnabled = await checkOnboardingEmailsEnabled(user.id)
            if (!isOnboardingEnabled) {
              logger.info(`   Skipping user ${user.id} (${user.email}) - onboarding emails disabled`)
              continue
            }

            // Check if email was already sent
            const emailLogKey = `${step.subject}|${user.id}`
            const alreadySent = await this.wasEmailAlreadySent(emailLogKey)

            if (alreadySent) {
              logger.info(`   Email already sent to user ${user.id} - ${step.description}`)
              continue
            }

            // Check if email is already scheduled for today (prevents duplicates with Brevo scheduled emails)
            const isScheduledToday = await ScheduledEmailTracker.isEmailScheduledForDate(user.id, step.description, currentDateUTC)

            if (isScheduledToday) {
              logger.info(`   Email already scheduled for today for user ${user.id} - ${step.description}`)
              continue
            }

            // Send the email using the legacy method (direct send)
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

      logger.info(`📊 Enhanced daily email sequence processing completed:`)
      logger.info(`   📧 Total emails sent: ${totalEmailsSent}`)
      logger.info(`   👥 Total users processed: ${totalUsersProcessed}`)
    } catch (error) {
      logger.error('❌ Error in enhanced daily email sequence processing:', error)
    }
  }

  /**
   * Schedule email sequence emails upon user registration (Production)
   * HYBRID APPROACH: Schedules Days 1-3 immediately (within Brevo's 72-hour limit)
   * Days 7+ will be handled by the enhanced cron job system
   */
  static async scheduleEmailSequenceForUser(userEmail: string, userName: string, userId: number, registrationTime: Date = new Date()): Promise<{ scheduled: number; failed: number; deferred: number }> {
    try {
      // Email sequence kill switch for staging
      if (process.env.DISABLE_EMAIL_SEQUENCE === 'true') {
        logger.info(`Email sequence disabled via DISABLE_EMAIL_SEQUENCE env var - skipping scheduling for user ${userId}`)
        return { scheduled: 0, failed: 0, deferred: 0 }
      }

      // Check if user has onboarding emails enabled
      const isOnboardingEnabled = await checkOnboardingEmailsEnabled(userId)
      if (!isOnboardingEnabled) {
        logger.info(`Skipping email sequence scheduling for user ${userId} - onboarding emails disabled`)
        return { scheduled: 0, failed: 0, deferred: 0 }
      }

      // Get all sequence steps (exclude Day 0 which is handled by welcome email)
      const sequenceSteps = EMAIL_SEQUENCES.ONBOARDING.steps.filter((step) => step.day > 0)

      // Split steps based on Brevo's 72-hour scheduling limit
      const BREVO_SCHEDULING_LIMIT_HOURS = 72
      const immediateSteps = sequenceSteps.filter((step) => step.day * 24 <= BREVO_SCHEDULING_LIMIT_HOURS)
      const deferredSteps = sequenceSteps.filter((step) => step.day * 24 > BREVO_SCHEDULING_LIMIT_HOURS)

      let scheduledCount = 0
      let failedCount = 0
      const deferredCount = deferredSteps.length

      logger.info(`📅 Scheduling emails for user ${userId}:`)
      logger.info(`   📤 Immediate (Brevo): ${immediateSteps.length} emails (Days ${immediateSteps.map((s) => s.day).join(', ')})`)
      logger.info(`   ⏰ Deferred (Cron): ${deferredSteps.length} emails (Days ${deferredSteps.map((s) => s.day).join(', ')})`)

      // Schedule immediate emails (Days 1-3) using Brevo scheduling
      for (const step of immediateSteps) {
        try {
          // Calculate exact send time: registration time + step.day days
          const scheduledTime = new Date(registrationTime.getTime() + step.day * 24 * 60 * 60 * 1000)

          // Check if this email was already scheduled or sent (duplicate prevention)
          const emailLogKey = `${step.subject}|${userId}`
          const alreadySent = await this.wasEmailAlreadySent(emailLogKey)
          const alreadyScheduled = await ScheduledEmailTracker.isEmailAlreadyScheduled(userId, step.subject)

          if (alreadySent) {
            logger.info(`   Email already sent: ${step.description} for user ${userId}`)
            continue
          }

          if (alreadyScheduled) {
            logger.info(`   Email already scheduled: ${step.description} for user ${userId}`)
            continue
          }

          // Generate and schedule the email via Brevo
          const emailScheduled = await this.scheduleSequenceEmail(userEmail, userName, userId, step, scheduledTime)

          if (emailScheduled) {
            scheduledCount++
            // NOTE: Do NOT mark as "sent" for scheduled emails - only track in scheduled-emails.json
            // They will be marked as sent when actually delivered (handled by delivery webhooks or cron)
            logger.info(`   ✅ Scheduled via Brevo: ${step.description} for ${scheduledTime.toISOString()}`)
          } else {
            failedCount++
            logger.error(`   ❌ Failed to schedule via Brevo: ${step.description} for user ${userId}`)
          }

          // Small delay between scheduling requests to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 200))
        } catch (error) {
          failedCount++
          logger.error(`   ❌ Error scheduling ${step.description} for user ${userId}:`, error)
        }
      }

      // Log deferred emails (will be handled by cron job)
      for (const step of deferredSteps) {
        logger.info(`   ⏰ Deferred for cron job: ${step.description} (Day ${step.day})`)
      }

      logger.info(`📊 Email sequence scheduling completed for user ${userId}:`)
      logger.info(`   📤 Scheduled (Brevo): ${scheduledCount}`)
      logger.info(`   ❌ Failed: ${failedCount}`)
      logger.info(`   ⏰ Deferred (Cron): ${deferredCount}`)

      return { scheduled: scheduledCount, failed: failedCount, deferred: deferredCount }
    } catch (error) {
      logger.error(`❌ Error scheduling email sequence for user ${userId}:`, error)
      return { scheduled: 0, failed: 0, deferred: 0 }
    }
  }

  /**
   * Cancel all scheduled emails for a user (when they unsubscribe)
   */
  static async cancelScheduledEmailsForUser(userId: number): Promise<number> {
    try {
      logger.info(`🚫 Cancelling all scheduled emails for user ${userId}`)
      const cancelledCount = await ScheduledEmailTracker.cancelUserScheduledEmails(userId)
      logger.info(`📊 Cancelled ${cancelledCount} scheduled emails for user ${userId}`)
      return cancelledCount
    } catch (error) {
      logger.error(`❌ Error cancelling scheduled emails for user ${userId}:`, error)
      return 0
    }
  }

  /**
   * Handle failed scheduled emails and retry them
   * Enhanced to detect email sequence gaps of unlimited length
   */
  static async handleFailedScheduledEmails(): Promise<void> {
    try {
      logger.info('🔍 Checking for failed scheduled emails and email sequence gaps...')

      const currentDate = new Date()
      const maxSequenceDays = Math.max(...EMAIL_SEQUENCES.ONBOARDING.steps.map((s) => s.day))

      // Check all users who could potentially have missing emails
      // We'll look back up to the maximum sequence day length to catch all possible gaps
      for (let daysBack = 1; daysBack <= maxSequenceDays; daysBack++) {
        const targetDate = new Date(currentDate.getTime() - daysBack * 24 * 60 * 60 * 1000)
        const dateString = targetDate.toISOString().split('T')[0]

        const users = await getUsersRegisteredOnDate(dateString)

        if (users.length === 0) continue

        // For each user registered on this date, check ALL missing emails, not just the day that matches daysBack
        for (const user of users) {
          try {
            // Check if user currently has onboarding emails enabled
            const isOnboardingEnabled = await checkOnboardingEmailsEnabled(user.id)
            if (!isOnboardingEnabled) continue

            // Calculate days since this user's registration
            const userRegistrationDate = new Date(user.created_at)
            const daysSinceUserRegistration = Math.floor((currentDate.getTime() - userRegistrationDate.getTime()) / (1000 * 60 * 60 * 24))

            // Get all sequence steps that should have been sent to this user by now
            const dueSteps = EMAIL_SEQUENCES.ONBOARDING.steps.filter((step) => step.day <= daysSinceUserRegistration)
            let userHasMissingEmails = false

            // Check each step to see if it was sent
            for (const step of dueSteps) {
              const emailLogKey = `${step.subject}|${user.id}`
              const alreadySent = await this.wasEmailAlreadySent(emailLogKey)

              if (!alreadySent) {
                if (!userHasMissingEmails) {
                  logger.info(`🔍 User ${user.id} registered ${daysSinceUserRegistration} days ago has missing emails - starting recovery`)
                  userHasMissingEmails = true
                }

                logger.info(`   🔄 Sending missing Day ${step.day} email for user ${user.id}: ${step.description}`)

                try {
                  // Send the email immediately since it was missed
                  await this.sendSequenceEmail(user, step)

                  // Mark as sent to prevent future retries
                  await this.markEmailAsSent(emailLogKey)

                  logger.info(`   ✅ Successfully sent missing email to user ${user.id}`)

                  // Small delay between emails for the same user
                  await new Promise((resolve) => setTimeout(resolve, 500))
                } catch (emailError) {
                  logger.error(`   ❌ Failed to send ${step.description} to user ${user.id}:`, emailError)
                }
              }
            }

            if (userHasMissingEmails) {
              // Add a longer delay between processing different users
              await new Promise((resolve) => setTimeout(resolve, 1000))
            }
          } catch (error) {
            logger.error(`   ❌ Failed to process user ${user.id}:`, error)
          }
        }
      }

      logger.info('✅ Failed scheduled emails and gap recovery completed')
    } catch (error) {
      logger.error('❌ Error handling failed scheduled emails:', error)
    }
  }

  /**
   * Recovery mechanism for users who re-enable onboarding emails
   * This detects and sends any missed emails when the flag is turned back on
   * Enhanced to handle cancelled scheduled emails
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
      const { getUserbyId } = await import('../../repository/user.repository')
      const user = await getUserbyId(userId)

      if (!user) {
        logger.info(`User ${userId} not found`)
        return { recovered: 0, details: ['User not found'] }
      }

      // Calculate days since registration
      const registrationDate = new Date(user.created_at)
      const currentDate = new Date()
      const daysSinceRegistration = Math.floor((currentDate.getTime() - registrationDate.getTime()) / (1000 * 60 * 60 * 24))

      logger.info(`User ${userId} registered ${daysSinceRegistration} days ago`)

      // Get cancelled scheduled emails for this user
      const cancelledEmails = await ScheduledEmailTracker.getCancelledEmailsForUser(userId)

      // Get all sequence steps that should have been sent by now OR were previously cancelled
      const allSteps = EMAIL_SEQUENCES.ONBOARDING.steps
      const dueSteps = allSteps.filter((step) => step.day <= daysSinceRegistration)

      // Add cancelled emails that might not be "due" yet but were previously scheduled
      const cancelledSteps = allSteps.filter((step) => cancelledEmails.some((cancelled: ScheduledEmailRecord) => cancelled.sequenceDay === step.day))

      // Combine and deduplicate steps
      const stepsToRecover = [...new Set([...dueSteps, ...cancelledSteps])]

      let recoveredCount = 0
      const recoveryDetails: string[] = []

      // Check each step to see if it was sent
      for (const step of stepsToRecover) {
        const emailLogKey = `${step.subject}|${userId}`
        const alreadySent = await this.wasEmailAlreadySent(emailLogKey)

        if (!alreadySent) {
          try {
            // Determine if this email should be sent immediately or scheduled
            const shouldSendImmediately = step.day <= daysSinceRegistration
            const isWithinSchedulingLimit = step.day * 24 <= 72 // Brevo's 72-hour limit

            if (shouldSendImmediately) {
              // Email is overdue - send immediately
              logger.info(`   📧 Sending overdue email immediately: ${step.description} (Day ${step.day})`)
              await this.sendSequenceEmail(user, step)
              recoveryDetails.push(`Sent immediately: ${step.description} (Day ${step.day})`)
            } else if (isWithinSchedulingLimit) {
              // Email is not due yet but was cancelled - re-schedule it
              const scheduledTime = new Date(registrationDate)
              scheduledTime.setDate(scheduledTime.getDate() + step.day)

              logger.info(`   📅 Re-scheduling cancelled email: ${step.description} (Day ${step.day}) for ${scheduledTime.toISOString()}`)
              const scheduled = await this.scheduleSequenceEmail(user.email, user.name || user.email, userId, step, scheduledTime)

              if (scheduled) {
                recoveryDetails.push(`Re-scheduled: ${step.description} (Day ${step.day}) for ${scheduledTime.toDateString()}`)
              } else {
                recoveryDetails.push(`Failed to re-schedule: ${step.description} (Day ${step.day})`)
              }
            } else {
              // Email is beyond Brevo's scheduling limit - will be handled by cron job
              logger.info(`   ⏰ Cancelled email beyond scheduling limit: ${step.description} (Day ${step.day}) - will be handled by cron job`)
              recoveryDetails.push(`Deferred to cron: ${step.description} (Day ${step.day})`)
            }

            recoveredCount++

            // Small delay between processing emails
            await new Promise((resolve) => setTimeout(resolve, 500))
          } catch (error) {
            logger.error(`   ❌ Failed to recover ${step.description}:`, error)
            recoveryDetails.push(`Failed: ${step.description} (Day ${step.day}) - ${error.message}`)
          }
        } else {
          recoveryDetails.push(`Already sent: ${step.description} (Day ${step.day})`)
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
      const { getUserbyId } = await import('../../repository/user.repository')
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
          unsubscribeLink: `${process.env.REACT_APP_BACKEND_URL}/unsubscribe?email=${encodeURIComponent(user.email)}`,
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
   * Schedule a specific sequence email for a user using Brevo scheduling
   */
  private static async scheduleSequenceEmail(userEmail: string, userName: string, userId: number, step: EmailSequenceStep, scheduledTime: Date): Promise<boolean> {
    try {
      // Check if user has active domains (for conditional content)
      const hasActiveDomains = await this.checkUserHasActiveDomains(userId)

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
          name: userName,
          email: userEmail,
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
          unsubscribeLink: `${process.env.REACT_APP_BACKEND_URL}/unsubscribe?email=${encodeURIComponent(userEmail)}`,
          year: new Date().getFullYear(),
        },
      })

      // Compile subject line for conditional content (Day 1 email has Handlebars syntax)
      const compiledSubject = step.subject.includes('{{#if') ? (hasActiveDomains ? step.subject.replace(/{{#if hasActiveDomains}}(.*?){{else}}.*?{{\/if}}/g, '$1') : step.subject.replace(/{{#if hasActiveDomains}}.*?{{else}}(.*?){{\/if}}/g, '$1')) : step.subject

      // Schedule the email using Brevo
      const result = await sendScheduledEmail(userEmail, compiledSubject, template, scheduledTime)

      if (result.success && result.messageId) {
        // Track the scheduled email for potential cancellation
        await ScheduledEmailTracker.addScheduledEmail({
          userId,
          emailType: step.description,
          messageId: result.messageId,
          batchId: result.batchId || '', // Provide fallback if batchId not available
          scheduledAt: scheduledTime.toISOString(),
          userEmail,
          sequenceDay: step.day,
        })

        logger.info(`Scheduled email successfully: ${step.description} for user ${userId} at ${scheduledTime.toISOString()}`)
        return true
      } else {
        logger.error(`Failed to schedule ${step.description} email for user ${userId}`)
        return false
      }
    } catch (error) {
      logger.error(`Failed to schedule ${step.description} email for user ${userId}:`, error)
      return false
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

// Type interfaces for better type safety (prefixed with _ to indicate intentionally unused for now)
interface _EmailSequenceStatus {
  sent: number
  total: number
  pending: string[]
}

interface _ScheduleEmailSequenceResult {
  scheduled: number
  failed: number
  deferred: number
}

interface _ScheduledEmail {
  userId: number
  emailType: string
  messageId: string
  batchId: string
  scheduledAt: string
  userEmail: string
  sequenceDay: number
}

export default EmailSequenceService
