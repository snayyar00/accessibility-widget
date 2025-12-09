import { sign } from '../../helpers/jwt.helper'
import { findUser, findUserNotificationByUserId, insertUserNotification } from '../../repository/user.repository'
import { getMatchingFrontendUrl } from '../../utils/env.utils'
import { AuthenticationError, ForbiddenError, ValidationError } from '../../utils/graphql-errors.helper'
import { sanitizeUserInput } from '../../utils/sanitization.helper'
import { getOrganizationById } from '../organization/organization.service'
import { UserLogined } from './get-user-logined.service'

export type ImpersonateResponse = {
  token: string
  url: string
}

/**
 * Allows super admins to impersonate any user by email
 * Generates a JWT token for the target user and returns redirect URL
 */
export async function impersonateUser(
  adminUser: UserLogined,
  targetEmail: string,
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

  // Find target user
  const targetUser = await findUser({ email })

  if (!targetUser) {
    return new AuthenticationError('User not found')
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
  const currentUrl = domain ? getMatchingFrontendUrl(domain) : null

  if (!currentUrl) {
    // Fallback: try to get any allowed frontend URL
    const fallbackUrl = getMatchingFrontendUrl(adminUser.currentOrganization?.domain || '')
    if (!fallbackUrl) {
      throw new ForbiddenError('No valid frontend URL found')
    }
    return {
      token: sign({
        email: targetUser.email,
        name: targetUser.name,
        createdAt: targetUser.created_at,
      }),
      url: fallbackUrl,
    }
  }

  return {
    token: sign({
      email: targetUser.email,
      name: targetUser.name,
      createdAt: targetUser.created_at,
    }),
    url: currentUrl,
  }
}

