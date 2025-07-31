import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

import database from '../../config/database.config'
import { ORGANIZATION_USER_ROLE_MEMBER, ORGANIZATION_USER_STATUS_ACTIVE } from '../../constants/organization.constant'
import { generatePassword } from '../../helpers/hashing.helper'
import { sign } from '../../helpers/jwt.helper'
import { addNewsletterSub } from '../../repository/newsletter_subscribers.repository'
import { Organization } from '../../repository/organization.repository'
import { createUser, findUser, updateUser } from '../../repository/user.repository'
import EmailSequenceService from '../../services/email/emailSequence.service'
import { ApolloError } from '../../utils/graphql-errors.helper'
import logger from '../../utils/logger'
import { sanitizeUserInput } from '../../utils/sanitization.helper'
import { createMultipleValidationErrors, createValidationError, getValidationErrorCode } from '../../utils/validation-errors.helper'
import { registerValidation } from '../../validations/authenticate.validation'
import { addUserToOrganization } from '../organization/organization_users.service'

dayjs.extend(utc)

type RegisterResponse = {
  token: string
}

async function registerUser(email: string, password: string, name: string, organization: Organization): Promise<ApolloError | RegisterResponse> {
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
      return new ApolloError('Email address has been used')
    }

    if (user && !user.is_active) {
      return new ApolloError('Your account is not yet verify')
    }

    await database.transaction(async (trx) => {
      const passwordHashed = await generatePassword(password)

      const userData = {
        email,
        password: passwordHashed,
        name,
        password_changed_at: dayjs().utc().format('YYYY-MM-DD HH:mm:ss'),
      }

      const newUserId = await createUser(userData, trx)

      // Auto-subscribe new users to newsletter and send welcome email
      if (newUserId && typeof newUserId === 'number') {
        try {
          // Subscribe to newsletter
          await addNewsletterSub(email)
          logger.info(`Auto-subscribed new user to newsletter: ${email}`)

          // Send Day 0 welcome email immediately
          const welcomeEmailSent = await EmailSequenceService.sendWelcomeEmail(email, name, newUserId)
          if (welcomeEmailSent) {
            logger.info(`Welcome email sent successfully to new user: ${email}`)
          } else {
            logger.warn(`Welcome email failed to send to new user: ${email}`)
          }
        } catch (error) {
          logger.error(`Failed to auto-subscribe user to newsletter or send welcome email: ${email}`, error)
          // Don't fail registration if newsletter subscription or welcome email fails
        }
      }

      if (typeof newUserId !== 'number') {
        throw new ApolloError('Failed to create user.')
      }

      const ids = await addUserToOrganization(newUserId, organization.id, ORGANIZATION_USER_ROLE_MEMBER, ORGANIZATION_USER_STATUS_ACTIVE, trx)

      if (!Array.isArray(ids) || ids.length === 0) {
        throw new ApolloError('Failed to add user to organization.')
      }

      await updateUser(newUserId, { current_organization_id: organization.id }, trx)
    })

    const token = sign({ email, name })

    return { token }
  } catch (error) {
    logger.error(error)
    throw error
  }
}

export { registerUser }
