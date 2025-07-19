import Validator, { ValidationError } from 'fastest-validator'

export function validateGetEngagementRates(input: { url: string; startDate: string; endDate: string }): true | ValidationError[] {
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
    startDate: {
      type: 'string',
      pattern: /^\d{4}-\d{2}-\d{2}$/,
      messages: {
        string: 'Start date must be a string',
        stringPattern: 'Start date must be in YYYY-MM-DD format',
      },
    },
    endDate: {
      type: 'string',
      pattern: /^\d{4}-\d{2}-\d{2}$/,
      messages: {
        string: 'End date must be a string',
        stringPattern: 'End date must be in YYYY-MM-DD format',
      },
    },
  }

  const result = validator.validate(input, schema)

  if (result === true) return true

  return result as ValidationError[]
}

export function validateFindImpressionsByURLAndDate(input: { url: string; startDate: Date; endDate: Date }): true | ValidationError[] {
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
    startDate: {
      type: 'date',
      messages: {
        date: 'Start date must be a valid date',
      },
    },
    endDate: {
      type: 'date',
      messages: {
        date: 'End date must be a valid date',
      },
    },
  }

  const result = validator.validate(input, schema)

  if (result === true) return true

  return result as ValidationError[]
}

export function validateAddImpressionsURL(input: { ipAddress: string; url: string }): true | ValidationError[] {
  const validator = new Validator()

  const schema = {
    ipAddress: {
      type: 'string',
      min: 1,
      max: 45, // IPv6 max length
      pattern: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^127\.0\.0\.1$/,
      messages: {
        string: 'IP address must be a string',
        stringMin: 'IP address must not be empty',
        stringMax: 'IP address is too long',
        stringPattern: 'IP address must be a valid IPv4 or IPv6 address',
      },
    },
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

  const result = validator.validate(input, schema)

  if (result === true) return true

  return result as ValidationError[]
}

export function validateAddProfileCount(input: { impressionId: number; profileCount: any }): true | ValidationError[] {
  const validator = new Validator()

  const schema = {
    impressionId: {
      type: 'number',
      positive: true,
      integer: true,
      messages: {
        number: 'Impression ID must be a number',
        numberPositive: 'Impression ID must be positive',
        numberInteger: 'Impression ID must be an integer',
      },
    },
    profileCount: {
      type: 'object',
      optional: true,
      messages: {
        object: 'Profile count must be an object',
      },
    },
  }

  const result = validator.validate(input, schema)

  if (result === true) return true

  return result as ValidationError[]
}

export function validateAddInteraction(input: { impressionId: number; interaction: string }): true | ValidationError[] {
  const validator = new Validator()

  const schema = {
    impressionId: {
      type: 'number',
      positive: true,
      integer: true,
      messages: {
        number: 'Site ID must be a number',
        numberPositive: 'Site ID must be positive',
        numberInteger: 'Site ID must be an integer',
      },
    },
    interaction: {
      type: 'string',
      custom(value: string) {
        if (value !== 'widgetClosed' && value !== 'widgetOpened') {
          return [{ type: 'stringEnum', message: 'Interaction must be either "widgetClosed" or "widgetOpened"' }]
        }
        return true
      },
      messages: {
        string: 'Interaction must be a string',
      },
    },
  }

  const result = validator.validate(input, schema)

  if (result === true) return true

  return result as ValidationError[]
}
