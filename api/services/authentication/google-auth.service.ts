import crypto from 'crypto'

import database from '../../config/database.config'
import { INVITATION_STATUS_PENDING } from '../../constants/invitation.constant'
import { ORGANIZATION_USER_ROLE_MEMBER, ORGANIZATION_USER_STATUS_ACTIVE, ORGANIZATION_USER_STATUS_PENDING, OrganizationUserRole } from '../../constants/organization.constant'
import { verifyGoogleIdToken } from '../../helpers/google-id-token.helper'
import { generatePassword } from '../../helpers/hashing.helper'
import { sign } from '../../helpers/jwt.helper'
import { getOrganizationInvitation, getWorkspaceInvitation } from '../../repository/invitations.repository'
import { getOrganizationById as getOrganizationByIdRepo, Organization } from '../../repository/organization.repository'
import { updateOrganizationUserByOrganizationAndUserId } from '../../repository/organization_user.repository'
import { createUser, findUser, findUserNotificationByUserId, insertUserNotification, updateUser } from '../../repository/user.repository'
import { getMatchingFrontendUrl } from '../../utils/env.utils'
import { ApolloError, AuthenticationError, ForbiddenError } from '../../utils/graphql-errors.helper'
import logger from '../../utils/logger'
import { normalizeEmail } from '../../helpers/string.helper'
import { sanitizeInput, validateNameField, validateNoLinks } from '../../utils/sanitization.helper'
import { getOrganizationById } from '../organization/organization.service'
import { addUserToOrganization } from '../organization/organization_users.service'

export type GoogleAuthResponse = {
  token: string
  url: string
}

export async function loginOrRegisterWithGoogle(
  idToken: string,
  organization: Organization,
): Promise<AuthenticationError | GoogleAuthResponse> {
  // Input validation
  if (!idToken || typeof idToken !== 'string' || idToken.length < 100 || idToken.length > 5000) {
    logger.warn('Invalid idToken format received in loginOrRegisterWithGoogle')
    return new AuthenticationError('Invalid Google token')
  }

  const payload = await verifyGoogleIdToken(idToken)
  if (!payload) {
    logger.warn('Token verification failed in loginOrRegisterWithGoogle')
    return new AuthenticationError('Invalid Google token')
  }

  const email = normalizeEmail(payload.email)
  let name = payload.name || email.split('@')[0]
  
  // Sanitize and validate name
  name = sanitizeInput(name)
  if (!name || name.length === 0 || name.length > 100) {
    name = email.split('@')[0] // Fallback to email prefix if name is invalid
  }
  if (!validateNameField(name) || !validateNoLinks(name)) {
    name = email.split('@')[0] // Fallback if name contains malicious content
  }
  
  const providerId = payload.sub
  let avatarUrl = payload.picture ?? undefined
  
  // Validate avatar URL if provided - use strict hostname matching to prevent bypass
  // (e.g. googleusercontent.com.evil.com must not pass)
  if (avatarUrl) {
    try {
      const url = new URL(avatarUrl)
      const hostname = url.hostname.toLowerCase()
      const isGoogleHost =
        hostname === 'googleusercontent.com' ||
        hostname.endsWith('.googleusercontent.com')
      if (url.protocol !== 'https:' || !isGoogleHost) {
        avatarUrl = undefined
      }
    } catch {
      avatarUrl = undefined // Invalid URL, ignore it
    }
  }

  let user = await findUser({ provider_id: providerId, provider: 'google' })

  if (!user) {
    user = await findUser({ email })
    if (user) {
      if (!user.provider) {
        // Link existing local account to Google and activate it (Google email is verified)
        await updateUser(user.id!, { provider: 'google', provider_id: providerId, avatar_url: avatarUrl, is_active: true })
      } else if (user.provider !== 'google') {
        return new AuthenticationError('This email is already registered with another sign-in method')
      } else {
        if (!user.provider_id || user.provider_id !== providerId) {
          await updateUser(user.id!, { provider_id: providerId, avatar_url: avatarUrl })
        }
      }
    }
  }

  if (user) {
    // Ensure user is active when signing in with Google (verified identity)
    if (!user.is_active) {
      await updateUser(user.id!, { is_active: true })
      user.is_active = true
    }

    let userOrganization: Organization

    if (user.current_organization_id) {
      userOrganization = await getOrganizationById(user.current_organization_id, user)
      if (!userOrganization) {
        throw new ApolloError('Organization not found')
      }
      if (userOrganization.id !== organization.id) {
        await updateUser(user.id!, { current_organization_id: organization.id })
        userOrganization = organization
      }
      await updateOrganizationUserByOrganizationAndUserId(userOrganization.id, user.id!, { status: ORGANIZATION_USER_STATUS_ACTIVE })
    } else {
      await database.transaction(async (trx) => {
        const ids = await addUserToOrganization(user.id!, organization.id, ORGANIZATION_USER_ROLE_MEMBER, ORGANIZATION_USER_STATUS_ACTIVE, trx)
        if (!Array.isArray(ids) || ids.length === 0) {
          throw new ApolloError('Failed to add user to organization.')
        }
        await updateUser(user.id!, { current_organization_id: organization.id }, trx)
        userOrganization = organization
      })
      userOrganization = organization
    }

    const notification = await findUserNotificationByUserId(user.id!, userOrganization.id)
    if (!notification) {
      try {
        await insertUserNotification(user.id!, userOrganization.id)
      } catch (err) {
        logger.error(`Failed to insert user notification for user ${user.id}, org ${userOrganization.id}:`, err)
      }
    }

    const currentUrl = getMatchingFrontendUrl(organization.domain)
    if (!currentUrl) {
      throw new ForbiddenError('Provided domain is not in the list of allowed URLs')
    }

    return {
      token: sign({ email: user.email, name: user.name, createdAt: user.created_at }),
      url: currentUrl,
    }
  }

  const [workspaceInvitation] = await getWorkspaceInvitation({ email, status: INVITATION_STATUS_PENDING })
  const [organizationInvitation] = !workspaceInvitation ? await getOrganizationInvitation({ email, status: INVITATION_STATUS_PENDING }) : [null]
  const invitation = workspaceInvitation || organizationInvitation
  const invitationOrgId = invitation?.organization_id
  const invitationRole = (organizationInvitation?.organization_role || ORGANIZATION_USER_ROLE_MEMBER) as OrganizationUserRole
  const targetOrgId = invitationOrgId ?? organization.id
  const userStatus = invitation ? ORGANIZATION_USER_STATUS_PENDING : ORGANIZATION_USER_STATUS_ACTIVE

  const passwordHashed = await generatePassword(crypto.randomBytes(32).toString('hex'))
  const userData = {
    email,
    name,
    password: passwordHashed,
    provider: 'google' as const,
    provider_id: providerId,
    avatar_url: avatarUrl,
    // Google email is verified, so mark the user as active
    is_active: true,
    password_changed_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
  }

  try {
    let newUserId: number
    await database.transaction(async (trx) => {
      const userId = await createUser(userData, trx)
      if (typeof userId !== 'number') {
        throw new ApolloError('Failed to create user.')
      }
      newUserId = userId
      await insertUserNotification(userId, targetOrgId, trx)
      const ids = await addUserToOrganization(userId, targetOrgId, invitationRole, userStatus, trx)
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new ApolloError('Failed to add user to organization.')
      }
      await updateUser(userId, { current_organization_id: targetOrgId }, trx)
    })

    const targetOrg = await getOrganizationByIdRepo(targetOrgId)
    if (!targetOrg) {
      throw new ApolloError('Target organization not found')
    }
    const targetUrl = getMatchingFrontendUrl(targetOrg.domain)
    if (!targetUrl) {
      throw new ForbiddenError('Provided domain is not in the list of allowed URLs')
    }

    return {
      token: sign({ email, name }),
      url: targetUrl,
    }
  } catch (error: any) {
    // Handle duplicate entry errors (race condition where two requests try to create the same user)
    if (
      error?.code === 'ER_DUP_ENTRY' ||
      error?.errno === 1062 ||
      (error?.message &&
        typeof error.message === 'string' &&
        error.message.includes('Duplicate entry') &&
        (error.message.includes('for key') || error.message.includes('email') || error.message.includes('provider_id')))
    ) {
      logger.warn('Duplicate Google sign-in attempt (race condition)', error)
      // Retry lookup - user may have been created by concurrent request
      const existingUser = await findUser({ provider_id: providerId, provider: 'google' })
      if (existingUser) {
        if (!existingUser.is_active) {
          await updateUser(existingUser.id!, { is_active: true })
          existingUser.is_active = true
        }
        // User was created, proceed with existing user flow
        const userOrg = await getOrganizationById(existingUser.current_organization_id || organization.id, existingUser)
        if (!userOrg) {
          throw new ApolloError('Organization not found')
        }
        const currentUrl = getMatchingFrontendUrl(userOrg.domain)
        if (!currentUrl) {
          throw new ForbiddenError('Provided domain is not in the list of allowed URLs')
        }
        return {
          token: sign({ email: existingUser.email, name: existingUser.name, createdAt: existingUser.created_at }),
          url: currentUrl,
        }
      }
      // If still not found, throw user-friendly error
      throw new ApolloError('Account creation failed. Please try again.', 'BAD_USER_INPUT')
    }

    logger.error('Google auth error:', error)
    throw error
  }
}
