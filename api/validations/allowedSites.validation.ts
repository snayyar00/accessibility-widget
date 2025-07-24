import Validator, { ValidationError } from 'fastest-validator'

export function validateDomain(input: { url: string }): true | ValidationError[] | Promise<true | ValidationError[]> {
  const validator = new Validator()

  const schema = {
    url: {
      type: 'string',
      min: 1,
      max: 2048,
      pattern: /^(https?:\/\/)?(www\.)?[a-zA-Z0-9][a-zA-Z0-9-]*(\.[a-zA-Z0-9][a-zA-Z0-9-]*)*\.[a-zA-Z]{2,}$/,
      messages: {
        string: 'URL must be a string',
        stringMin: 'URL must not be empty',
        stringMax: 'URL must not exceed 2048 characters',
        stringPattern: 'URL must be a valid domain (e.g., example.com, https://example.com)',
      },
    },
  }

  return validator.validate(input, schema)
}

export function validateChangeURL(input: { siteId: number; url: string }): true | ValidationError[] | Promise<true | ValidationError[]> {
  const validator = new Validator()

  const schema = {
    siteId: {
      type: 'number',
      integer: true,
      positive: true,
      min: 1,
      messages: {
        number: 'siteId must be a number',
        numberInteger: 'siteId must be an integer',
        numberPositive: 'siteId must be positive',
        numberMin: 'siteId must be greater than 0',
      },
    },
    url: {
      type: 'string',
      min: 4,
      max: 2048,
      pattern: /^(https?:\/\/)?(www\.)?[a-zA-Z0-9][a-zA-Z0-9-]*(\.[a-zA-Z0-9][a-zA-Z0-9-]*)*\.[a-zA-Z]{2,}$/,
      messages: {
        string: 'URL must be a string',
        stringMin: 'URL is too short',
        stringMax: 'URL is too long',
        stringPattern: 'URL must be a valid domain (e.g., example.com, https://example.com)',
      },
    },
  }

  return validator.validate(input, schema)
}
