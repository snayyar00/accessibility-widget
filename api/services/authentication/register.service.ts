import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

import database from '../../config/database.config'
import { INVITATION_STATUS_PENDING } from '../../constants/invitation.constant'
import { ORGANIZATION_USER_ROLE_MEMBER, ORGANIZATION_USER_STATUS_ACTIVE, ORGANIZATION_USER_STATUS_PENDING, OrganizationUserRole } from '../../constants/organization.constant'
import { generatePassword } from '../../helpers/hashing.helper'
import { sign } from '../../helpers/jwt.helper'
import { getOrganizationInvitation, getWorkspaceInvitation } from '../../repository/invitations.repository'
import { getOrganizationById as getOrganizationByIdRepo, Organization } from '../../repository/organization.repository'
import { createUser, findUser, insertUserNotification, updateUser } from '../../repository/user.repository'
import EmailSequenceService from '../../services/email/emailSequence.service'
import { getMatchingFrontendUrl } from '../../utils/env.utils'
import { ApolloError, ForbiddenError } from '../../utils/graphql-errors.helper'
import logger from '../../utils/logger'
import { sanitizeUserInput } from '../../utils/sanitization.helper'
import { createMultipleValidationErrors, createValidationError, getValidationErrorCode } from '../../utils/validation-errors.helper'
import { registerValidation } from '../../validations/authenticate.validation'
import { addUserToOrganization } from '../organization/organization_users.service'

dayjs.extend(utc)

type RegisterResponse = {
  token: string
  url: string
}

async function registerUser(email: string, password: string, name: string, organization: Organization, allowedFrontendUrl: string, referralCode?: string): Promise<RegisterResponse> {
  const sanitizedInput = sanitizeUserInput({ email, name })

  email = sanitizedInput.email
  name = sanitizedInput.name

  const validateResult = registerValidation({ email, password, name })

  if (Array.isArray(validateResult) && validateResult.length) {
    const errorMessages = validateResult.map((it) => it.message)

    if (errorMessages.length > 1) {
      throw createMultipleValidationErrors(errorMessages)
    } else {
      const errorCode = getValidationErrorCode(errorMessages)
      throw createValidationError(errorCode, errorMessages[0])
    }
  }

  try {
    const user = await findUser({ email })

    if (user) {
      throw new ApolloError('Email address has been used', 'BAD_USER_INPUT')
    }

    if (user && !user.is_active) {
      throw new ApolloError('Your account is not yet verify', 'BAD_USER_INPUT')
    }

    let newUserId: number | undefined
    let targetOrgId: number

    await database.transaction(async (trx) => {
      const passwordHashed = await generatePassword(password)

      interface UserData {
        email: string
        password: string
        name: string
        password_changed_at: string
        referral?: string
      }

      const userData: UserData = {
        email,
        password: passwordHashed,
        name,
        password_changed_at: dayjs().utc().format('YYYY-MM-DD HH:mm:ss'),
      }

      // Add referral code if provided
      if (referralCode) {
        userData.referral = referralCode
      }

      const userId = await createUser(userData, trx)

      if (typeof userId !== 'number') {
        throw new ApolloError('Failed to create user.')
      }

      newUserId = userId

      const [workspaceInvitation] = await getWorkspaceInvitation({ email, status: INVITATION_STATUS_PENDING })
      const [organizationInvitation] = !workspaceInvitation ? await getOrganizationInvitation({ email, status: INVITATION_STATUS_PENDING }) : [null]

      const invitation = workspaceInvitation || organizationInvitation
      const invitationOrgId = invitation?.organization_id

      const invitationRole = (organizationInvitation?.organization_role || ORGANIZATION_USER_ROLE_MEMBER) as OrganizationUserRole

      targetOrgId = invitationOrgId || organization.id
      const userStatus = invitation ? ORGANIZATION_USER_STATUS_PENDING : ORGANIZATION_USER_STATUS_ACTIVE

      // Create user_notifications record with onboarding emails enabled (within transaction)
      try {
        await insertUserNotification(userId, targetOrgId, trx)
        logger.info(`Created user_notifications record for user: ${email}`)
      } catch (error) {
        logger.error(`Failed to create user_notifications: ${email}`, error)
        throw error // Fail the transaction if user_notifications creation fails
      }

      const ids = await addUserToOrganization(userId, targetOrgId, invitationRole, userStatus, trx)

      if (!Array.isArray(ids) || ids.length === 0) {
        throw new ApolloError('Failed to add user to organization.')
      }

      await updateUser(userId, { current_organization_id: targetOrgId }, trx)
    })

    // Send welcome email after transaction completes successfully
    // The email sequence will be handled by the daily cron job
    if (newUserId) {
      try {
        const welcomeEmailSent = await EmailSequenceService.sendWelcomeEmail(email, name, newUserId, organization.id, allowedFrontendUrl)
        if (welcomeEmailSent) {
          logger.info(`Welcome email sent successfully to new user: ${email}`)
        } else {
          logger.warn(`Welcome email failed to send to new user: ${email}`)
        }
      } catch (error) {
        logger.error(`Failed to send welcome email: ${email}`, error)
        // Don't fail registration if welcome email fails
      }
    }

    // Get the target organization to return the correct URL
    const targetOrg = await getOrganizationByIdRepo(targetOrgId)

    if (!targetOrg) {
      throw new ApolloError('Target organization not found')
    }

    const targetUrl = getMatchingFrontendUrl(targetOrg.domain)

    if (!targetUrl) {
      throw new ForbiddenError('Provided domain is not in the list of allowed URLs')
    }

    const token = sign({ email, name })

    return { token, url: targetUrl }
  } catch (error: any) {
    // Handle duplicate entry errors (race condition where two requests try to register the same email)
    if (
      error?.code === 'ER_DUP_ENTRY' ||
      error?.errno === 1062 ||
      (error?.message && 
       typeof error.message === 'string' && 
       error.message.includes('Duplicate entry') &&
       error.message.includes('for key'))
    ) {
      logger.warn(`Duplicate registration attempt for email: ${email}`, error)
      // Throw a user-friendly error instead of the database error
      throw new ApolloError('Email address has been used', 'BAD_USER_INPUT')
    }

    logger.error('Registration error:', error)
    throw error
  }
}

export { registerUser }
