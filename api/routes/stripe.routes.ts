import { Router } from 'express';
import { strictLimiter, moderateLimiter } from '../middlewares/limiters.middleware';
import { isAuthenticated } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validation.middleware';
import { billingPortalSessionValidation, createCustomerPortalSessionValidation, validateCouponValidation, validateCreateCheckoutSession, validateCancelSiteSubscription, validateCreateSubscription, validateApplyRetentionDiscount } from '../validations/stripe.validation';

import { createCustomerPortalSession } from '../controllers/stripe/customer-portal.controller';
import { createBillingPortalSession } from '../controllers/stripe/billing-portal.controller';
import { validateCoupon } from '../controllers/stripe/validate-coupon.controller';
import { createCheckoutSession } from '../controllers/stripe/checkout-session.controller';
import { cancelSiteSubscription } from '../controllers/stripe/cancel-subscription.controller';
import { applyRetentionDiscount } from '../controllers/stripe/retention-discount.controller';
import { createSubscription } from '../controllers/stripe/create-subscription.controller';
import { checkCustomer } from '../controllers/stripe/check-customer.controller';

const router = Router();

router.post('/create-customer-portal-session', strictLimiter, isAuthenticated, validateBody(createCustomerPortalSessionValidation), createCustomerPortalSession);

router.post('/billing-portal-session', strictLimiter, isAuthenticated, validateBody(billingPortalSessionValidation), createBillingPortalSession);

router.post('/validate-coupon', strictLimiter, isAuthenticated, validateBody(validateCouponValidation), validateCoupon);

router.post('/create-checkout-session', strictLimiter, isAuthenticated, validateBody(validateCreateCheckoutSession), createCheckoutSession);

router.post('/cancel-site-subscription', strictLimiter, isAuthenticated, validateBody(validateCancelSiteSubscription), cancelSiteSubscription);

router.post('/create-subscription', strictLimiter, isAuthenticated, validateBody(validateCreateSubscription), createSubscription);

router.post('/apply-retention-discount', strictLimiter, isAuthenticated, validateBody(validateApplyRetentionDiscount), applyRetentionDiscount);

router.post('/check-customer', moderateLimiter, isAuthenticated, checkCustomer);

export default router;
