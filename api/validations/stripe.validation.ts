import Validator, { ValidationError } from 'fastest-validator'

type ApplyRetentionDiscountInfo = {
  domainId: string | number
  status: string
}

export function validateApplyRetentionDiscount(data: ApplyRetentionDiscountInfo): true | ValidationError[] | Promise<true | ValidationError[]> {
  const validator = new Validator()

  const schema = {
    domainId: [
      { type: 'number', integer: true, positive: true },
      { type: 'string', empty: false, min: 1, max: 32 },
    ],
    status: {
      type: 'string',
      empty: false,
      min: 2,
      max: 32,
      enum: ['Trial', 'Trial Expired', 'Active', 'Canceled', 'Life Time'],
    },
  }

  return validator.validate(data, schema)
}

type CancelSiteSubscriptionInfo = {
  domainId: string | number
  domainUrl: string
  status: string
  cancelReason?: string
  otherReason?: string
}

export function validateCancelSiteSubscription(data: CancelSiteSubscriptionInfo): true | ValidationError[] | Promise<true | ValidationError[]> {
  const validator = new Validator()
  const schema = {
    domainId: [
      { type: 'number', integer: true, positive: true },
      { type: 'string', empty: false, min: 1, max: 32 },
    ],
    domainUrl: { type: 'string', empty: false, min: 1, max: 253 },
    status: { type: 'string', empty: false, min: 2, max: 32 },
    cancelReason: { type: 'string', optional: true, max: 128 },
    otherReason: { type: 'string', optional: true, max: 256 },
  }
  return validator.validate(data, schema)
}

type CreateSubscriptionInfo = {
  planName: string
  billingInterval: 'MONTHLY' | 'YEARLY'
  domainId: string | number
  domainUrl: string
  cardTrial?: boolean
  promoCode?: string[]
}

export function validateCreateSubscription(data: CreateSubscriptionInfo): true | ValidationError[] | Promise<true | ValidationError[]> {
  const validator = new Validator()

  const schema = {
    planName: { type: 'string', empty: false, min: 1, max: 100 },
    billingInterval: { type: 'string', enum: ['MONTHLY', 'YEARLY'] },
    domainId: [
      { type: 'number', integer: true, positive: true },
      { type: 'string', empty: false, min: 1, max: 32 },
    ],
    domainUrl: { type: 'string', empty: false, min: 1, max: 253 },
    cardTrial: { type: 'boolean', optional: true },
    promoCode: {
      type: 'array',
      items: [
        { type: 'string', min: 1, max: 32 },
        { type: 'number', integer: true, positive: true },
      ],
      optional: true,
      max: 10,
    },
  }

  return validator.validate(data, schema)
}

type CreateCheckoutSessionInfo = {
  planName: string
  billingInterval: 'MONTHLY' | 'YEARLY'
  returnUrl: string
  domainId: string | number
  domain: string
  cardTrial?: boolean
  promoCode?: string[]
}

export function validateCreateCheckoutSession(data: CreateCheckoutSessionInfo): true | ValidationError[] | Promise<true | ValidationError[]> {
  const validator = new Validator()

  const schema = {
    planName: { type: 'string', empty: false, min: 1, max: 100 },
    billingInterval: { type: 'string', enum: ['MONTHLY', 'YEARLY'] },
    returnUrl: { type: 'string', empty: false, min: 5, max: 300, custom: validateURL },
    domainId: [
      { type: 'number', integer: true, positive: true },
      { type: 'string', empty: false, min: 1, max: 32 },
    ],
    domain: { type: 'string', empty: false, min: 1, max: 253 },
    cardTrial: { type: 'boolean', optional: true },
    promoCode: {
      type: 'array',
      items: [
        { type: 'string', min: 1, max: 32 },
        { type: 'number', integer: true, positive: true },
      ],
      optional: true,
      max: 10,
    },
  }

  return validator.validate(data, schema)
}

type ValidateCouponInfo = {
  couponCode: string
}

export function validateCouponValidation(data: ValidateCouponInfo): true | ValidationError[] | Promise<true | ValidationError[]> {
  const validator = new Validator()
  const schema = {
    couponCode: {
      type: 'string',
      empty: false,
      min: 5,
      max: 32,
      trim: true,
    },
  }
  return validator.validate(data, schema)
}

type BillingPortalSessionInfo = {
  returnURL: string
}

export function billingPortalSessionValidation(data: BillingPortalSessionInfo): true | ValidationError[] | Promise<true | ValidationError[]> {
  const validator = new Validator()

  const schema = {
    returnURL: {
      type: 'string',
      empty: false,
      min: 5,
      max: 300,
      custom: validateURL,
    },
  }
  return validator.validate(data, schema)
}

type CreateCustomerPortalSessionInfo = {
  returnURL: string
}

export function createCustomerPortalSessionValidation(data: CreateCustomerPortalSessionInfo): true | ValidationError[] | Promise<true | ValidationError[]> {
  const validator = new Validator()

  const schema = {
    returnURL: {
      type: 'string',
      empty: false,
      min: 5,
      max: 300,
      custom: validateURL,
    },
  }
  return validator.validate(data, schema)
}

function validateURL(value: string) {
  try {
    const frontendUrl = process.env.FRONTEND_URL

    if (!frontendUrl) {
      return [{ type: 'url', message: 'FRONTEND_URL is not configured on the server' }]
    }

    if (!value.startsWith(frontendUrl)) {
      return [{ type: 'url', message: 'Invalid return URL (not allowed)' }]
    }

    return true
  } catch {
    return [{ type: 'url', message: 'Invalid return URL' }]
  }
}
