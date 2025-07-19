import { Response } from 'express'

import { comparePassword } from '../../helpers/hashing.helper'
import { sign } from '../../helpers/jwt.helper'
import { incrementFailedAttempts, isAccountLocked, lockAccount, resetFailedAttempts } from '../../repository/failed_login_attempts.repository'
import { findUser } from '../../repository/user.repository'
import { clearCookie, COOKIE_NAME } from '../../utils/cookie'
import { AuthenticationError, ValidationError } from '../../utils/graphql-errors.helper'
import { sanitizeUserInput } from '../../utils/sanitization.helper'
import { loginValidation } from '../../validations/authenticate.validation'

export type Token = {
  token: string
}

export async function loginUser(email: string, password: string, res: Response): Promise<ValidationError | AuthenticationError | Token> {
  const sanitizedInput = sanitizeUserInput({ email })
  email = sanitizedInput.email

  const validateResult = loginValidation({ email, password })
  if (Array.isArray(validateResult) && validateResult.length) {
    return new ValidationError(validateResult.map((it) => it.message).join(','))
  }

  const user = await findUser({ email })

  if (!user) {
    clearCookie(res, COOKIE_NAME.TOKEN)
    return new AuthenticationError('Invalid email or password')
  }

  // Check if account is locked BEFORE authentication
  const accountLocked = await isAccountLocked(user.id)
  if (accountLocked) {
    clearCookie(res, COOKIE_NAME.TOKEN)
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
      clearCookie(res, COOKIE_NAME.TOKEN)
      return new AuthenticationError('ACCOUNT_LOCKED_AFTER_ATTEMPTS')
    }

    // Show warning after 3 attempts
    if (currentAttempts >= 3) {
      const remainingAttempts = 5 - currentAttempts
      clearCookie(res, COOKIE_NAME.TOKEN)
      return new AuthenticationError(`ATTEMPTS_WARNING:${remainingAttempts}`)
    }

    clearCookie(res, COOKIE_NAME.TOKEN)
    return new AuthenticationError('Invalid email or password')
  }

  // Clear failed attempts after successful authentication
  await resetFailedAttempts(user.id)

  return {
    token: sign({
      email: user.email,
      name: user.name,
      createdAt: user.created_at,
    }),
  }
}
