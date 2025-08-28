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

export function validateInviteWorkspaceMember(input: { workspaceId: number; email: string; role: string }): true | ValidationError[] | Promise<true | ValidationError[]> {
  const validator = new Validator()

  const schema = {
    workspaceId: { type: 'number', positive: true, integer: true, messages: { number: 'Workspace ID must be a number', numberPositive: 'Workspace ID must be positive', numberInteger: 'Workspace ID must be an integer' } },
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
    role: { type: 'enum', values: WORKSPACE_ALL_ROLES, messages: { enum: `Role must be one of: ${WORKSPACE_ALL_ROLES.join(', ')}` } },
  }

  return validator.validate(input, schema)
}

export function validateChangeWorkspaceMemberRole(input: { id: number; role: string }): true | ValidationError[] | Promise<true | ValidationError[]> {
  const validator = new Validator()

  const schema = {
    id: { type: 'number', positive: true, integer: true, messages: { number: 'ID must be a number', numberPositive: 'ID must be positive', numberInteger: 'ID must be an integer' } },
    role: { type: 'enum', values: WORKSPACE_ALL_ROLES, messages: { enum: `Role must be one of: ${WORKSPACE_ALL_ROLES.join(', ')}` } },
  }

  return validator.validate(input, schema)
}

export function validateRemoveWorkspaceMember(input: { id: number }): true | ValidationError[] | Promise<true | ValidationError[]> {
  const validator = new Validator()

  const schema = {
    id: { type: 'number', positive: true, integer: true, messages: { number: 'ID must be a number', numberPositive: 'ID must be positive', numberInteger: 'ID must be an integer' } },
  }

  return validator.validate(input, schema)
}

export function validateRemoveWorkspaceInvitation(input: { id: number }): true | ValidationError[] | Promise<true | ValidationError[]> {
  const validator = new Validator()

  const schema = {
    id: { type: 'number', positive: true, integer: true, messages: { number: 'ID must be a number', numberPositive: 'ID must be positive', numberInteger: 'ID must be an integer' } },
  }

  return validator.validate(input, schema)
}
