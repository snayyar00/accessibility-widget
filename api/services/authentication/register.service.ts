import logger from '../../config/logger.config'
import { generatePassword } from '../../helpers/hashing.helper'
import { sign } from '../../helpers/jwt.helper'
import { createUser, findUser } from '../../repository/user.repository'
import { ApolloError } from '../../utils/graphql-errors.helper'
import { sanitizeUserInput } from '../../utils/sanitization.helper'
import { createMultipleValidationErrors, createValidationError, getValidationErrorCode } from '../../utils/validation-errors.helper'
import { registerValidation } from '../../validations/authenticate.validation'
import { Token } from './login.service'

async function registerUser(email: string, password: string, name: string): Promise<ApolloError | Token> {
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

    const passwordHashed = await generatePassword(password)
    const userData = {
      email,
      password: passwordHashed,
      name,
    }

    await createUser(userData)
    const token = sign({ email, name })

    return { token }
  } catch (error) {
    logger.error(error)
    throw error
  }
}

export { registerUser }
