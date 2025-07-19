import Validator, { ValidationError } from 'fastest-validator'

import { normalizeDomain } from '../utils/domain.utils'

export function validateWidgetSettings(input: { settings: any; site_url: any }): true | ValidationError[] | Promise<true | ValidationError[]> {
  const validator = new Validator()

  const schema = {
    site_url: {
      type: 'string',
      empty: false,
      trim: true,
      max: 253,
      pattern: /^(?!https?:\/\/)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/,
      messages: {
        stringPattern: 'Site URL must be a valid domain.',
        stringEmpty: 'Site URL is required.',
      },
    },
    settings: {
      type: 'string',
      empty: false,
      nullable: true,
      messages: {
        string: 'Settings must be a valid JSON string.',
        stringEmpty: 'Settings must be provided.',
      },
      custom(value: any) {
        if (value === null) return true

        try {
          const parsed = JSON.parse(value)

          if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            return [{ type: 'settings', message: 'Settings must be a valid JSON object.' }]
          }

          return true
        } catch {
          return [{ type: 'settings', message: 'Settings must be a valid JSON object.' }]
        }
      },
    },
  }

  const result = validator.validate(input, schema)

  if (result === true) return true

  return result as ValidationError[]
}

export function validateTokenUrl(input: { url: string }): true | ValidationError[] {
  const validator = new Validator()

  const schema = {
    url: {
      type: 'string',
      min: 4,
      max: 2048,
      custom(value: string) {
        const cleanUrl = normalizeDomain(value)

        if (cleanUrl === 'localhost' || cleanUrl.startsWith('localhost:')) return true

        const domainPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]*(\.[a-zA-Z0-9][a-zA-Z0-9-]*)*\.[a-zA-Z]{2,}$/

        if (!domainPattern.test(cleanUrl)) {
          return [{ type: 'url', message: 'URL must be a valid domain (e.g., example.com, https://example.com)' }]
        }

        return true
      },
    },
  }

  const result = validator.validate(input, schema)

  if (result === true) return true

  return result as ValidationError[]
}
