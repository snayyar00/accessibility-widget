import database from '../../config/database.config'
import { ORGANIZATION_USER_ROLE_MEMBER, ORGANIZATION_USER_STATUS_ACTIVE } from '../../constants/organization.constant'
import { comparePassword } from '../../helpers/hashing.helper'
import { sign } from '../../helpers/jwt.helper'
import { incrementFailedAttempts, isAccountLocked, lockAccount, resetFailedAttempts } from '../../repository/failed_login_attempts.repository'
import { findUser, updateUser } from '../../repository/user.repository'
import { getMatchingFrontendUrl } from '../../utils/env.utils'
import { ApolloError, AuthenticationError, ForbiddenError, ValidationError } from '../../utils/graphql-errors.helper'
import { sanitizeUserInput } from '../../utils/sanitization.helper'
import { loginValidation } from '../../validations/authenticate.validation'
import { getOrganizationByDomainService, getOrganizationById } from '../organization/organization.service'
import { addUserToOrganization } from '../organization/organization_users.service'

export type LoginResponse = {
  token: string
  url: string
}

export async function loginUser(email: string, password: string, clientDomain: string | null): Promise<ValidationError | AuthenticationError | LoginResponse> {
  const sanitizedInput = sanitizeUserInput({ email })
  email = sanitizedInput.email

  const validateResult = loginValidation({ email, password })

  if (Array.isArray(validateResult) && validateResult.length) {
    return new ValidationError(validateResult.map((it) => it.message).join(','))
  }

  const organization = await getOrganizationByDomainService(clientDomain)

  if (!organization || !('id' in organization) || !organization.id) {
    return new ForbiddenError('Sorry, you cannot log in.')
  }

  const user = await findUser({ email })

  if (!user) {
    return new AuthenticationError('Invalid email or password')
  }

  // Check if account is locked BEFORE authentication
  const accountLocked = await isAccountLocked(user.id)

  if (accountLocked) {
    return new AuthenticationError('ACCOUNT_LOCKED')
  }

  const matchPassword = await comparePassword(password, user.password)

  if (!matchPassword) {
    // Increment failed attempts after failed authentication
    const attemptRecord = await incrementFailedAttempts(user.id)
    const currentAttempts = attemptRecord.failed_count

    // Check if account should be locked (>= 5 attempts)
    if (currentAttempts >= 5) {
      await lockAccount(user.id)
      return new AuthenticationError('ACCOUNT_LOCKED_AFTER_ATTEMPTS')
    }

    // Show warning after 3 attempts
    if (currentAttempts >= 3) {
      const remainingAttempts = 5 - currentAttempts
      return new AuthenticationError(`ATTEMPTS_WARNING:${remainingAttempts}`)
    }

    return new AuthenticationError('Invalid email or password')
  }

  let userOrganization

  if (user.current_organization_id) {
    userOrganization = await getOrganizationById(user.current_organization_id, user)
    await resetFailedAttempts(user.id)
  } else {
    await database.transaction(async (trx) => {
      const ids = await addUserToOrganization(user.id, organization.id, ORGANIZATION_USER_ROLE_MEMBER, ORGANIZATION_USER_STATUS_ACTIVE, trx)

      if (!Array.isArray(ids) || ids.length === 0) {
        throw new ApolloError('Failed to add user to organization.')
      }

      await updateUser(user.id, { current_organization_id: organization.id }, trx)

      userOrganization = organization

      await resetFailedAttempts(user.id, trx)
    })
  }

  return {
    token: sign({
      email: user.email,
      name: user.name,
      createdAt: user.created_at,
    }),

    url: getMatchingFrontendUrl(userOrganization.domain),
  }
}
