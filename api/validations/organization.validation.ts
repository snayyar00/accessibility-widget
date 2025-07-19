import Validator, { ValidationError } from 'fastest-validator'

export function validateAddOrganization(input: { name: string; domain: string; logo_url?: string; settings?: any }): true | ValidationError[] | Promise<true | ValidationError[]> {
  const validator = new Validator()

  const schema = {
    name: { type: 'string', min: 2, max: 255, messages: { string: 'Name must be a string', stringMin: 'Name is too short', stringMax: 'Name is too long' } },
    domain: { type: 'string', min: 3, max: 100, pattern: /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, messages: { string: 'Domain must be a string', stringMin: 'Domain is too short', stringMax: 'Domain is too long', stringPattern: 'Domain must be a valid domain (e.g., example.com)' } },
    logo_url: { type: 'string', optional: true, max: 500, messages: { string: 'Logo URL must be a string', stringMax: 'Logo URL is too long' } },
    settings: { type: 'object', optional: true },
  }

  return validator.validate(input, schema)
}

export function validateEditOrganization(input: { id: number | string; name?: string; domain?: string; logo_url?: string; settings?: any }): true | ValidationError[] | Promise<true | ValidationError[]> {
  const validator = new Validator()

  const schema = {
    id: { type: 'number', convert: true, messages: { number: 'ID must be a number' } },
    name: { type: 'string', min: 2, max: 255, optional: true },
    domain: { type: 'string', min: 3, max: 100, pattern: /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, optional: true },
    logo_url: { type: 'string', optional: true, max: 500 },
    settings: { type: 'object', optional: true },
  }

  return validator.validate(input, schema)
}

export function validateRemoveOrganization(input: { id: number | string }): true | ValidationError[] | Promise<true | ValidationError[]> {
  const validator = new Validator()

  const schema = {
    id: { type: 'number', convert: true, messages: { number: 'ID must be a number' } },
  }

  return validator.validate(input, schema)
}
