import Validator, { ValidationError } from 'fastest-validator'

export function validateUpdateSitesPlan(input: { userId: number; sitePlanId: number; planName: string; billingType: 'MONTHLY' | 'YEARLY'; hook?: boolean }): true | ValidationError[] | Promise<true | ValidationError[]> {
  const validator = new Validator()

  const schema = {
    userId: {
      type: 'number',
      integer: true,
      positive: true,
      min: 1,
      max: 999999999,
      messages: {
        number: 'userId must be a number',
        numberInteger: 'userId must be an integer',
        numberPositive: 'userId must be positive',
        numberMin: 'userId must be greater than 0',
        numberMax: 'userId is too large',
      },
    },
    sitePlanId: {
      type: 'number',
      integer: true,
      positive: true,
      min: 1,
      max: 999999999,
      messages: {
        number: 'sitePlanId must be a number',
        numberInteger: 'sitePlanId must be an integer',
        numberPositive: 'sitePlanId must be positive',
        numberMin: 'sitePlanId must be greater than 0',
        numberMax: 'sitePlanId is too large',
      },
    },
    planName: {
      type: 'string',
      min: 1,
      max: 64,
      messages: {
        string: 'planName must be a string',
        stringMin: 'planName is required',
        stringMax: 'planName is too long',
      },
    },
    billingType: {
      type: 'string',
      enum: ['MONTHLY', 'YEARLY'],
      messages: {
        string: 'billingType must be a string',
        enumValue: 'billingType must be MONTHLY or YEARLY',
      },
    },
    hook: {
      type: 'boolean',
      optional: true,
    },
  }

  return validator.validate(input, schema)
}

export function validateGetPlanBySiteIdAndUserId(input: { userId: number; siteId: number }): true | ValidationError[] | Promise<true | ValidationError[]> {
  const validator = new Validator()

  const schema = {
    userId: {
      type: 'number',
      integer: true,
      positive: true,
      min: 1,
      max: 999999999,
      messages: {
        number: 'userId must be a number',
        numberInteger: 'userId must be an integer',
        numberPositive: 'userId must be positive',
        numberMin: 'userId must be greater than 0',
        numberMax: 'userId is too large',
      },
    },
    siteId: {
      type: 'number',
      integer: true,
      positive: true,
      min: 1,
      max: 999999999,
      messages: {
        number: 'siteId must be a number',
        numberInteger: 'siteId must be an integer',
        numberPositive: 'siteId must be positive',
        numberMin: 'siteId must be greater than 0',
        numberMax: 'siteId is too large',
      },
    },
  }

  return validator.validate(input, schema)
}
