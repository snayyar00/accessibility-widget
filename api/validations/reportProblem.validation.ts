import Validator, { ValidationError } from 'fastest-validator'

import { getRootDomain } from '../utils/domain.utils'

export function validateReportProblem(input: { site_url: string; issue_type: string; description: string; reporter_email: string }): true | ValidationError[] | Promise<true | ValidationError[]> {
  const filtered = getRootDomain(input.site_url)
  input.site_url = filtered
  const validator = new Validator()
  const schema = {
    site_url: {
      type: 'string',
      min: 4,
      max: 2048,
      pattern: /^(https?:\/\/)?(www\.)?[a-zA-Z0-9][a-zA-Z0-9-]*(\.[a-zA-Z0-9][a-zA-Z0-9-]*)*\.[a-zA-Z]{2,}$/,
      messages: {
        string: 'Site URL must be a string',
        stringMin: 'Site URL is too short',
        stringMax: 'Site URL is too long',
        stringPattern: 'Site URL must be a valid domain (e.g., example.com, https://example.com)',
      },
    },
    issue_type: {
      type: 'string',
      enum: ['bug', 'accessibility'],
      messages: {
        string: 'Issue type must be a string',
        enumValue: 'Issue type must be either "bug" or "accessibility"',
      },
    },
    description: {
      type: 'string',
      min: 1,
      max: 2000,
      messages: {
        string: 'Description must be a string',
        stringMin: 'Description is too short',
        stringMax: 'Description is too long',
      },
    },
    reporter_email: {
      type: 'email',
      max: 254,
      messages: {
        email: 'Reporter email must be a valid email address',
        stringMax: 'Reporter email is too long',
      },
    },
  }

  return validator.validate(input, schema)
}
