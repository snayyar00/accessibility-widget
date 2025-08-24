import Validator, { ValidationError } from 'fastest-validator'

import { WORKSPACE_ALL_ROLES } from '../constants/workspace.constant'
import { Workspace } from '../repository/workspace.repository'
import { validateEmailNotAlias } from '../utils/sanitization.helper'

export function validateCreateWorkspace(input: { name: string }): true | ValidationError[] | Promise<true | ValidationError[]> {
  const validator = new Validator()

  const schema = {
    name: { type: 'string', min: 2, max: 255, messages: { string: 'Workspace name must be a string', stringMin: 'Workspace name is too short', stringMax: 'Workspace name is too long' } },
  }

  return validator.validate(input, schema)
}

export function validateUpdateWorkspace(input: Workspace): true | ValidationError[] | Promise<true | ValidationError[]> {
  const validator = new Validator()

  const schema = {
    name: { type: 'string', min: 2, max: 255, optional: true, messages: { string: 'Workspace name must be a string', stringMin: 'Workspace name is too short', stringMax: 'Workspace name is too long' } },
  }

  return validator.validate(input, schema)
}

export function validateInviteWorkspaceMember(input: { email: string; alias: string; role: string }): true | ValidationError[] | Promise<true | ValidationError[]> {
  const validator = new Validator()

  const schema = {
    email: {
      type: 'email',
      max: 254,
      custom: (value: string) => {
        if (!validateEmailNotAlias(value)) {
          return [{ type: 'custom', message: 'Invalid email address' }]
        }

        return true
      },
      messages: { email: 'Email must be a valid email address' },
    },
    alias: { type: 'string', min: 2, max: 255, messages: { string: 'Workspace alias must be a string', stringMin: 'Workspace alias is too short', stringMax: 'Workspace alias is too long' } },
    role: { type: 'enum', values: WORKSPACE_ALL_ROLES, messages: { enum: `Role must be one of: ${WORKSPACE_ALL_ROLES.join(', ')}` } },
  }

  return validator.validate(input, schema)
}
