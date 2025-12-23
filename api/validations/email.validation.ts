import Validator, { ValidationError } from 'fastest-validator'

import { validateEmailNotAlias } from '../utils/sanitization.helper'

export function emailValidation(email: string | undefined, maxLength = 254): true | ValidationError[] | Promise<true | ValidationError[]> {
  const validator = new Validator()

  const schema = {
    email: {
      type: 'email',
      max: maxLength,
      messages: {
        email: 'Please enter a valid email address (e.g., user@example.com)',
        stringMax: `Email address must be no more than ${maxLength} characters`,
      },
      custom: (value: string) => {
        if (!validateEmailNotAlias(value)) {
          return [{ type: 'custom', message: 'Invalid email address' }]
        }

        return true
      },
    },
  }

  return validator.validate({ email }, schema)
}
