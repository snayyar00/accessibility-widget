import Validator, { ValidationError } from 'fastest-validator'

// Domain pattern examples:
//   Pass: example.com, my-site.io, sub.domain.net, try-webability-app.server.techywebsolutions.com.127.0.0.1.sslip.io:3000, localhost, localhost:3000
//   Fail: http://example.com, https://my-site.io, example (no dot), .com (no name), example@com (invalid char)
const domainPattern = /^([a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|localhost)(:\d+)?$/

// Domain pattern with protocol examples:
//   Pass: example.com, my-site.io, http://example.com, https://my-site.io, sub.domain.net, https://example.com/1212/12/12, localhost, localhost:3001
//   Fail: example (no dot), .com (no name), example@com (invalid char)
const domainPatternWithProtocol = /^(https?:\/\/)?([a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|localhost)(:\d+)?(\/.*)?$/

export function validateAddOrganization(input: { name: string; domain: string; logo_url?: string; settings?: any }): true | ValidationError[] | Promise<true | ValidationError[]> {
  const validator = new Validator()

  const schema = {
    name: { type: 'string', min: 2, max: 255, messages: { string: 'Name must be a string', stringMin: 'Name is too short', stringMax: 'Name is too long' } },
    domain: { type: 'string', min: 3, max: 100, pattern: domainPattern, messages: { string: 'Domain must be a string', stringMin: 'Domain is too short', stringMax: 'Domain is too long', stringPattern: 'Domain must be a valid domain (e.g., example.com)' } },
    logo_url: { type: 'string', optional: true, max: 500, messages: { string: 'Logo URL must be a string', stringMax: 'Logo URL is too long' } },
    settings: { type: 'object', optional: true },
  }

  return validator.validate(input, schema)
}

export function validateEditOrganization(input: {
  id: number | string
  name?: string
  domain?: string
  logo_url?: string
  settings?: any
  smtp_host?: string
  smtp_port?: number
  smtp_secure?: boolean
  smtp_user?: string
  smtp_password?: string
}): true | ValidationError[] | Promise<true | ValidationError[]> {
  const validator = new Validator()

  const schema = {
    id: { type: 'number', convert: true, messages: { number: 'ID must be a number' } },
    name: { type: 'string', min: 2, max: 255, optional: true },
    domain: { type: 'string', min: 3, max: 100, pattern: domainPattern, optional: true },
    logo_url: { type: 'string', optional: true, max: 500 },
    settings: { type: 'object', optional: true },
    smtp_host: { type: 'string', optional: true, max: 255 },
    smtp_port: { type: 'number', optional: true, min: 1, max: 65535 },
    smtp_secure: { type: 'boolean', optional: true },
    smtp_user: { type: 'string', optional: true, max: 255 },
    smtp_password: { type: 'string', optional: true, max: 512 },
  }

  return validator.validate(input, schema)
}

export function validateGetOrganizationByDomain(input: { domain: string }): true | ValidationError[] | Promise<true | ValidationError[]> {
  const validator = new Validator()

  const schema = {
    domain: { type: 'string', min: 3, max: 100, pattern: domainPatternWithProtocol, messages: { string: 'Domain must be a string', stringMin: 'Domain is too short', stringMax: 'Domain is too long', stringPattern: 'Domain must be a valid domain (e.g., example.com, http://example.com)' } },
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
