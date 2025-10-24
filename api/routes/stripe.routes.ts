import { Router } from 'express'

import { createBillingPortalSession } from '../controllers/stripe/billing-portal.controller'
import { cancelSiteSubscription } from '../controllers/stripe/cancel-subscription.controller'
import { checkCustomer } from '../controllers/stripe/check-customer.controller'
import { createCheckoutSession } from '../controllers/stripe/checkout-session.controller'
import { createSubscription } from '../controllers/stripe/create-subscription.controller'
import { createCustomerPortalSession } from '../controllers/stripe/customer-portal.controller'
import { applyRetentionDiscount } from '../controllers/stripe/retention-discount.controller'
import { getRewardfulDiscount } from '../controllers/stripe/rewardful-discount.controller'
import { validateCoupon } from '../controllers/stripe/validate-coupon.controller'
import { allowedOrganization, isAuthenticated } from '../middlewares/auth.middleware'
import { moderateLimiter, strictLimiter } from '../middlewares/limiters.middleware'
import { validateBody } from '../middlewares/validation.middleware'
import { billingPortalSessionValidation, createCustomerPortalSessionValidation, validateApplyRetentionDiscount, validateCancelSiteSubscription, validateCouponValidation, validateCreateCheckoutSession, validateCreateSubscription } from '../validations/stripe.validation'

const router = Router()

router.post('/create-customer-portal-session', strictLimiter, allowedOrganization, isAuthenticated, validateBody(createCustomerPortalSessionValidation), createCustomerPortalSession)

router.post('/billing-portal-session', strictLimiter, allowedOrganization, isAuthenticated, validateBody(billingPortalSessionValidation), createBillingPortalSession)

router.post('/validate-coupon', strictLimiter, allowedOrganization, isAuthenticated, validateBody(validateCouponValidation), validateCoupon)

router.get('/rewardful-discount', moderateLimiter, getRewardfulDiscount)

router.post('/create-checkout-session', strictLimiter, allowedOrganization, isAuthenticated, validateBody(validateCreateCheckoutSession), createCheckoutSession)

router.post('/cancel-site-subscription', strictLimiter, allowedOrganization, isAuthenticated, validateBody(validateCancelSiteSubscription), cancelSiteSubscription)

router.post('/create-subscription', strictLimiter, allowedOrganization, isAuthenticated, validateBody(validateCreateSubscription), createSubscription)

router.post('/apply-retention-discount', strictLimiter, allowedOrganization, isAuthenticated, validateBody(validateApplyRetentionDiscount), applyRetentionDiscount)

router.post('/check-customer', moderateLimiter, allowedOrganization, isAuthenticated, checkCustomer)

export default router
