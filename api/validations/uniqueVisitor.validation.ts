import Validator, { ValidationError } from 'fastest-validator'

export function validateGetSiteVisitorsByURL(input: { url: string; startDate?: Date; endDate?: Date }): true | ValidationError[] | Promise<true | ValidationError[]> {
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
      optional: true,
      convert: true,
      messages: {
        date: 'Start date must be a valid date',
      },
    },
    endDate: {
      type: 'date',
      optional: true,
      convert: true,
      messages: {
        date: 'End date must be a valid date',
      },
    },
  }

  return validator.validate(input, schema)
}
