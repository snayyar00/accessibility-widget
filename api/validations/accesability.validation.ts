import Validator, { ValidationError } from 'fastest-validator'

export function validateSaveAccessibilityReportInput(data: any): true | ValidationError[] | Promise<true | ValidationError[]> {
  const validator = new Validator()

  const schema = {
    url: {
      type: 'string',
      optional: true,
      max: 2048,
      trim: true,
      pattern: /^([\w\-]+\.)+[\w\-]+(\/[^\s]*)?$/,
      messages: {
        stringPattern: 'URL must be a valid domain without protocol',
        stringEmpty: 'URL is required',
      },
    },
    allowed_sites_id: {
      type: 'number',
      integer: true,
      positive: true,
      optional: true,
    },
    key: {
      type: 'string',
      min: 5,
      max: 256,
      optional: true,
    },
    score: {
      type: 'object',
      optional: true,
    },
    report: {
      type: 'object',
      optional: false,
    },
  }

  return validator.validate(data, schema)
}

export function validateR2Key(r2_key: unknown): true | ValidationError[] | Promise<true | ValidationError[]> {
  const validator = new Validator()

  const schema = {
    r2_key: {
      type: 'string',
      min: 5,
      max: 256,
      empty: false,
      messages: {
        stringMin: 'r2_key must be at least 5 characters',
        stringEmpty: 'r2_key is required',
      },
    },
  }

  return validator.validate({ r2_key }, schema)
}

export type AccessibilityReportR2Filter = {
  url?: string
  created_at?: string
  updated_at?: string
}

export function validateAccessibilityReportR2Filter(data: AccessibilityReportR2Filter): true | ValidationError[] | Promise<true | ValidationError[]> {
  const validator = new Validator()
  const isoDatePattern = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z?)?$/

  const schema = {
    url: {
      type: 'string',
      optional: true,
      max: 2048,
      trim: true,
      pattern: /^([\w\-]+\.)+[\w\-]+(\/[^\s]*)?$/,
      messages: {
        stringPattern: 'URL must be a valid domain without protocol',
      },
    },

    created_at: {
      type: 'string',
      optional: true,
      pattern: isoDatePattern,
      messages: {
        stringPattern: 'created_at must be a valid ISO date string',
      },
    },

    updated_at: {
      type: 'string',
      optional: true,
      pattern: isoDatePattern,
      messages: {
        stringPattern: 'updated_at must be a valid ISO date string',
      },
    },
  }

  return validator.validate(data, schema)
}

type AccessibilityReportInfo = {
  url: string
}

export function validateAccessibilityReport(data: AccessibilityReportInfo): true | ValidationError[] | Promise<true | ValidationError[]> {
  const validator = new Validator()

  const schema = {
    url: {
      type: 'string',
      empty: false,
      max: 2048,
      trim: true,
      pattern: /^(https?:\/\/)?([\w\-]+\.)+[\w\-]+(\/[^\s]*)?$/,
      messages: {
        stringPattern: 'URL must be a valid domain or URL format',
        stringEmpty: 'URL is required',
      },
    },
  }

  return validator.validate(data, schema)
}
