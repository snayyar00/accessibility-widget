import * as crypto from 'crypto'
import { sign } from '../../helpers/jwt.helper'
import { findUser, findUserNotificationByUserId, insertUserNotification } from '../../repository/user.repository'
import { getMatchingFrontendUrl } from '../../utils/env.utils'
import { AuthenticationError, ForbiddenError, ValidationError } from '../../utils/graphql-errors.helper'
import { sanitizeUserInput } from '../../utils/sanitization.helper'
import { getOrganizationById } from '../organization/organization.service'
import { UserLogined } from './get-user-logined.service'
import { sendMail } from '../email/email.service'
import logger from '../../utils/logger'
import compileEmailTemplate from '../../helpers/compile-email-template'

export type ImpersonateResponse = {
  token: string
  url: string
}

/**
 * Allows super admins to impersonate any user by email
 * Requires the target user's password hash for additional security
 * Generates a JWT token for the target user and returns redirect URL
 */
export async function impersonateUser(
  adminUser: UserLogined,
  targetEmail: string,
  targetUserPassword: string,
): Promise<ValidationError | AuthenticationError | ForbiddenError | ImpersonateResponse> {
  // Only super admins can impersonate
  if (!adminUser.is_super_admin) {
    return new ForbiddenError('Only super admins can impersonate users')
  }

  // Sanitize input
  const sanitizedInput = sanitizeUserInput({ email: targetEmail })
  const email = sanitizedInput.email

  if (!email) {
    return new ValidationError('Email is required')
  }

  if (!targetUserPassword) {
    return new ValidationError('Target user password hash is required')
  }

  // Find target user
  const targetUser = await findUser({ email })

  if (!targetUser) {
    return new AuthenticationError('Invalid credentials')
  }

  // Verify the provided password hash matches the target user's stored password hash
  if (!targetUser.password) {
    return new AuthenticationError('Invalid credentials')
  }

  // Constant-time hash comparison using crypto.timingSafeEqual to prevent timing attacks
  const bufferA = Buffer.from(targetUserPassword, 'utf8')
  const bufferB = Buffer.from(targetUser.password, 'utf8')

  // timingSafeEqual requires buffers of the same length
  if (bufferA.length !== bufferB.length) {
    // Perform dummy comparison to maintain constant time
    const maxLength = Math.max(bufferA.length, bufferB.length)
    const dummyBuffer = Buffer.alloc(maxLength)
    try {
      crypto.timingSafeEqual(dummyBuffer, dummyBuffer)
    } catch {
      // Ignore error
    }
    return new AuthenticationError('Invalid credentials')
  }

  // Use Node.js built-in timing-safe comparison
  try {
    if (!crypto.timingSafeEqual(bufferA, bufferB)) {
      return new AuthenticationError('Invalid credentials')
    }
  } catch {
    return new AuthenticationError('Invalid credentials')
  }

  // Get target user's organization
  let organization = null
  if (targetUser.current_organization_id) {
    try {
      organization = await getOrganizationById(targetUser.current_organization_id, {
        id: targetUser.id,
        email: targetUser.email,
        is_super_admin: false,
      } as UserLogined)
    } catch (error) {
      // Organization might not exist or user might not have access
      // Continue without organization - will use admin's organization domain as fallback
      console.warn('Could not fetch target user organization:', error)
    }
  }

  // If user has an organization, ensure notifications are set up
  if (organization && targetUser.current_organization_id) {
    const notification = await findUserNotificationByUserId(targetUser.id, targetUser.current_organization_id)

    if (!notification) {
      try {
        await insertUserNotification(targetUser.id, targetUser.current_organization_id)
      } catch (error) {
        console.error('Failed to add user to notification:', error)
      }
    }
  }

  // Get frontend URL - use organization domain if available, otherwise use admin's organization domain
  const domain = organization?.domain || adminUser.currentOrganization?.domain
  let currentUrl = domain ? getMatchingFrontendUrl(domain) : null

  // Fallback: try to get any allowed frontend URL if currentUrl is null
  if (!currentUrl) {
    const fallbackUrl = getMatchingFrontendUrl(adminUser.currentOrganization?.domain || '')
    if (!fallbackUrl) {
      throw new ForbiddenError('No valid frontend URL found')
    }
    currentUrl = fallbackUrl
  }

  // Prepare impersonation response
  const impersonateResult = {
    token: sign({
      email: targetUser.email,
      name: targetUser.name,
      createdAt: targetUser.created_at,
    }),
    url: currentUrl,
  }

  // Send email notification about impersonation (non-blocking)
  setImmediate(async () => {
    try {
      const now = new Date()
      const impersonationTimeUTC = now.toISOString()
      const impersonationTime = now.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short',
      })
      const adminEmail = adminUser.email
      const targetUserEmail = targetUser.email

      // Compile email template
      const emailHtml = await compileEmailTemplate({
        fileName: 'impersonationNotification.mjml',
        data: {
          targetUserEmail,
          adminEmail,
          impersonationTime,
          impersonationTimeUTC,
        },
      })

      const subject = `User Impersonation Alert - ${targetUserEmail}`
      const notificationEmail = 'talhashahzad899@gmail.com'

      const emailSent = await sendMail(notificationEmail, subject, emailHtml, undefined, 'WebAbility Security')

      if (emailSent) {
        logger.info(`Impersonation notification email sent successfully to ${notificationEmail} for user ${targetUserEmail}`)
      } else {
        logger.error(`Failed to send impersonation notification email to ${notificationEmail}`)
      }
    } catch (error) {
      // Log error but don't fail the impersonation if email fails
      logger.error('Error sending impersonation notification email:', error)
    }
  })

  return impersonateResult
}

