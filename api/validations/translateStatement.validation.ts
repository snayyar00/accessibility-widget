import Validator, { ValidationError } from 'fastest-validator'

export function validateTranslateStatement(input: { content: string | { [key: string]: string }; targetLanguage: string; languageCode: string; context?: string }): true | ValidationError[] | Promise<true | ValidationError[]> {
  const validator = new Validator()

  const schema = {
    content: {
      type: 'any',
      optional: false,
      messages: {
        any: 'Content is required',
      },
    },
    targetLanguage: {
      type: 'string',
      min: 2,
      max: 80,
      pattern: /^[a-zA-Z-]+$/,
      messages: {
        string: 'Target language must be a string',
        stringMin: 'Target language code is too short',
        stringMax: 'Target language code is too long',
        stringPattern: 'Target language must contain only letters and hyphens',
      },
    },
    languageCode: {
      type: 'string',
      min: 2,
      max: 10,
      pattern: /^[a-zA-Z-]+$/,
      messages: {
        string: 'Language code must be a string',
        stringMin: 'Language code is too short',
        stringMax: 'Language code is too long',
        stringPattern: 'Language code must contain only letters and hyphens',
      },
    },
    context: {
      type: 'string',
      optional: true,
      max: 1000,
      messages: {
        string: 'Context must be a string',
        stringMax: 'Context is too long',
      },
    },
  }

  return validator.validate(input, schema)
}
