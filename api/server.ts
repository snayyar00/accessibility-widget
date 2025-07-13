import { requireJsonContent } from './middlewares/contentType.middleware';
import { emailLimiter } from './middlewares/limiters.middleware';
import dotenv from 'dotenv';

import express, { NextFunction, Request, Response } from 'express';
import morgan from 'morgan';
import cors from 'cors';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { ApolloServer, ApolloError } from 'apollo-server-express';
import { withScope, Severity, captureException, init, Handlers } from '@sentry/node';
import * as Sentry from '@sentry/node';
import { IResolvers } from '@graphql-tools/utils';
import { makeExecutableSchema } from '@graphql-tools/schema';

import accessLogStream from './middlewares/logger.middleware';
import RootSchema from './graphql/root.schema';
import RootResolver from './graphql/root.resolver';
import getUserLogined from './services/authentication/get-user-logined.service';
import stripeHooks from './services/stripe/webhooks.servive';
import { findProductAndPriceByType, findProductById } from './repository/products.repository';
import { createSitesPlan, deleteExpiredSitesPlan, deleteSitesPlan, deleteTrialPlan } from './services/allowedSites/plans-sites.service';
import Stripe from 'stripe';
import { getAnySitePlanBySiteId, getSitePlanBySiteId, getSitesPlanByUserId } from './repository/sites_plans.repository';
import { findPriceById } from './repository/prices.repository';
import { APP_SUMO_COUPON_IDS, APP_SUMO_DISCOUNT_COUPON, RETENTION_COUPON_ID } from './constants/billing.constant';
import scheduleMonthlyEmails from './jobs/monthlyEmail';
import { getProblemReportsBySiteId } from './repository/problem_reports.repository';
import { deleteSiteWithRelatedRecords, findSiteById, findSiteByURL, findSitesByUserId, IUserSites } from './repository/sites_allowed.repository';
import { addWidgetSettings, getWidgetSettingsBySiteId } from './repository/widget_settings.repository';
import findPromo from './services/stripe/findPromo';
import { appSumoPromoCount } from './utils/appSumoPromoCount';
import { expireUsedPromo } from './utils/expireUsedPromo';
import { getUserTokens } from './repository/user_plan_tokens.repository';
import { customTokenCount } from './utils/customTokenCount';
import { addCancelFeedback, CancelFeedbackProps } from './repository/cancel_feedback.repository';
import { billingPortalSessionValidation, createCustomerPortalSessionValidation, validateCancelSiteSubscription, validateCouponValidation, validateCreateCheckoutSession, validateCreateSubscription, validateApplyRetentionDiscount } from '~/validations/stripe.validation';
import { validateBody } from './middlewares/validation.middleware';
import { isAuthenticated } from '~/middlewares/auth.middleware';
import { UserProfile } from '~/repository/user.repository';

import { strictLimiter, moderateLimiter } from './middlewares/limiters.middleware';
import { validateWidgetSettings } from '~/validations/widget.validation';
import axios from 'axios';
import { sendMail } from '~/libs/mail';
import { emailValidation } from '~/validations/email.validation';
import { addNewsletterSub } from '~/repository/newsletter_subscribers.repository';

import { rateLimitDirective } from 'graphql-rate-limit-directive';
import getIpAddress from '~/utils/getIpAddress';

dotenv.config();

const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY);

const subscriptionKey = process.env.AZURE_API_KEY;
const endpoint = process.env.AZURE_ENDPOINT;
const region = process.env.AZURE_REGION;


type ContextParams = {
  req: Request;
  res: Response;
};
interface Issue {
  [key: string]: any;
}

const IS_LOCAL_DEV = !process.env.COOLIFY_URL && process.env.NODE_ENV !== 'production';

const app = express();
const port = process.env.PORT || 3001;

const allowedOrigins = [
  process.env.FRONTEND_URL, 
  ...(process.env.COOLIFY_URL ? [process.env.COOLIFY_URL] : []), 
  'https://www.webability.io', 
  'https://hoppscotch.webability.io'
];

console.log('Allowed Origins:', allowedOrigins);

const allowedOperations = ['validateToken', 'addImpressionsURL', 'registerInteraction', 'reportProblem', 'updateImpressionProfileCounts'];



app.post('/stripe-hooks', strictLimiter, express.raw({ type: 'application/json' }), stripeHooks);
app.use(express.json({ limit: '5mb' }));

scheduleMonthlyEmails();

function dynamicCors(req: Request, res: Response, next: NextFunction) {
  const corsOptions = {
    optionsSuccessStatus: 200,
    credentials: true,

    origin: (origin: any, callback: any) => {
      // Allow local development
      if (IS_LOCAL_DEV) {
        return callback(null, true);
      }

      // Allow preflight OPTIONS requests
      if (req.method === 'OPTIONS') {
        return callback(null, true);
      }

      // Allow predefined origins
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Allow specific GraphQL operations (widget operations)
      if (req.body && allowedOperations.includes(req.body.operationName)) {
        return callback(null, true);
      }

      // Reject all other origins
      callback(new Error('Not allowed by CORS'));
    },

    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  };

  cors(corsOptions)(req, res, next);
}

(function startServer() {
  // Configure Morgan with conditional stream (null = console, stream = file)
  if (accessLogStream) {
    app.use(morgan('combined', { stream: accessLogStream }));
  } else {
    app.use(morgan('combined')); // Will use console
  }

  app.use(dynamicCors);
  app.use(cookieParser());
  app.use(bodyParser.urlencoded({ extended: true, limit: '5mb' }));

  app.get('/', (_, res) => {
    res.send('Hello world!');
  });

  app.post('/create-customer-portal-session', strictLimiter, isAuthenticated, validateBody(createCustomerPortalSessionValidation), async (req, res) => {
    const user: UserProfile = (req as any).user;
    const { returnURL } = req.body;

    let customerId: string;
    try {
      const customers = await stripe.customers.list({
        email: user.email,
        limit: 1,
      });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        const newCustomer = await stripe.customers.create({
          email: user.email,
        });
        customerId = newCustomer.id;
      }
    } catch (error) {
      console.error('Stripe customer error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }

    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnURL,
      });
      return res.status(200).json(session);
    } catch (error) {
      console.error('Stripe session error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/billing-portal-session', strictLimiter, isAuthenticated, validateBody(billingPortalSessionValidation), async (req, res) => {
    try {
      const user: UserProfile = (req as any).user;
      const { returnURL } = req.body;

      // Search for an existing customer by email
      let customers;
      try {
        customers = await stripe.customers.list({
          email: user.email,
          limit: 1,
        });
      } catch (error) {
        console.error('Stripe customers.list error:', error);
        return res.status(500).json({ error: 'Failed to fetch Stripe customer' });
      }

      let customer;
      // Check if customer exists
      if (customers.data.length > 0) {
        customer = customers.data[0];
      } else {
        try {
          customer = await stripe.customers.create({
            email: user.email,
          });
        } catch (error) {
          console.error('Stripe customers.create error:', error);
          return res.status(500).json({ error: 'Failed to create Stripe customer' });
        }
      }

      let subscriptions, trialingSubscriptions;
      try {
        subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          status: 'active',
          limit: 100,
        });

        trialingSubscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          status: 'trialing',
          limit: 100,
        });
      } catch (error) {
        console.error('Stripe subscriptions.list error:', error);
        return res.status(500).json({ error: 'Failed to fetch subscriptions' });
      }

      // Merge trialing subscriptions into active subscriptions
      subscriptions.data.push(...trialingSubscriptions.data);

      if (subscriptions.data.length !== 0) {
        let prices;
        try {
          prices = await stripe.prices.list({
            limit: 50,
          });
        } catch (error) {
          console.error('Stripe prices.list error:', error);
          return res.status(500).json({ error: 'Failed to fetch prices' });
        }

        let usablePrices;
        try {
          usablePrices = await Promise.all(
            prices.data.map(async (price: Stripe.Price) => {
              if (price?.tiers_mode === 'graduated' && price?.recurring?.usage_type === 'licensed') {
                const product = await stripe.products.retrieve(price.product as string);
                if (product.name.toLowerCase().includes('app sumo')) {
                  return null;
                }
                return price;
              }
              return null;
            }),
          );
        } catch (error) {
          console.error('Stripe products.retrieve error:', error);
          return res.status(500).json({ error: 'Failed to process prices' });
        }

        usablePrices = usablePrices.filter((price: Stripe.Price) => price !== null);
        const productPriceArray: any = [];
        const productMap = new Map();

        usablePrices.forEach((price: Stripe.Price) => {
          if (!productMap.has(price.product)) {
            productMap.set(price.product, []);
          }
          productMap.get(price.product).push(price);
        });

        productMap.forEach((prices, productId) => {
          productPriceArray.push({
            product: productId,
            prices: prices.map((price: Stripe.Price) => price.id),
          });
        });

        let configurations;

        try {
          configurations = await stripe.billingPortal.configurations.list({
            is_default: true,
          });
        } catch (error) {
          console.error('Stripe billingPortal.configurations.list error:', error);
          return res.status(500).json({ error: 'Failed to fetch billing portal configurations' });
        }

        // Check if there is at least one configuration
        if (!configurations.data || configurations.data.length === 0) {
          console.error('No billing portal configurations found');
          return res.status(500).json({ error: 'No billing portal configurations found' });
        }

        let configuration: any = {};

        try {
          configuration = await stripe.billingPortal.configurations.update(configurations.data[0].id, {
            features: {
              subscription_update: { enabled: false },
              subscription_cancel: { enabled: false },
            },
          });
        } catch (error) {
          console.error('Stripe billingPortal.configurations.update error:', error);
          return res.status(500).json({ error: 'Failed to update billing portal configuration' });
        }

        try {
          const session = await stripe.billingPortal.sessions.create({
            customer: customer.id,
            return_url: returnURL,
            configuration: configuration.id,
          });
          return res.status(200).json(session);
        } catch (error) {
          console.error('Stripe billingPortal.sessions.create error:', error);
          return res.status(500).json({ error: 'Failed to create billing portal session' });
        }
      } else {
        try {
          const session = await stripe.billingPortal.sessions.create({
            customer: customer.id,
            return_url: returnURL,
          });
          return res.status(200).json(session);
        } catch (error) {
          console.error('Stripe billingPortal.sessions.create error:', error);
          return res.status(500).json({ error: 'Failed to create billing portal session' });
        }
      }
    } catch (error) {
      console.error('Unexpected error in /billing-portal-session:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/validate-coupon', strictLimiter, isAuthenticated, validateBody(validateCouponValidation), async (req, res) => {
    const { couponCode } = req.body;

    try {
      let promoCodeData = await findPromo(stripe, couponCode.trim());

      if (!promoCodeData) {
        return res.json({ valid: false, error: 'Invalid promo code' });
      }

      if (!promoCodeData.active) {
        return res.json({ valid: false, error: 'Promo Expired' });
      }

      if (!APP_SUMO_COUPON_IDS.includes(promoCodeData.coupon.id)) {
        return res.json({ valid: false, error: 'Invalid promo code Not from App Sumo' });
      }

      if (promoCodeData.coupon.percent_off) {
        const coupon = await stripe.coupons.retrieve(promoCodeData.coupon.id, { expand: ['applies_to'] });
        const product = await stripe.products.retrieve(coupon.applies_to.products[0]);
        return res.json({ valid: true, discount: Number(promoCodeData.coupon.percent_off) / 100, id: promoCodeData.coupon.id, percent: true, planName: product.name.toLowerCase() });
      } else {
        return res.json({ valid: true, discount: Number(promoCodeData.coupon.amount_off) / 100, id: promoCodeData.coupon.id, percent: false });
      }
    } catch (error) {
      console.log('err', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/update-site-widget-settings', moderateLimiter, isAuthenticated, validateBody(validateWidgetSettings), async (req, res) => {
    const user: UserProfile = (req as any).user;
    const { settings, site_url } = req.body;

    try {
      const site = await findSiteByURL(site_url);

      if (!site || site.user_id !== user.id) {
        return res.status(403).json({ error: 'User does not own this site' });
      }

      await addWidgetSettings({
        site_url: site_url,
        allowed_site_id: site?.id,
        settings: settings,
        user_id: site.user_id,
      });

      res.status(200).json('Success');
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post(
    '/get-site-widget-settings',
    moderateLimiter,
    isAuthenticated,
    validateBody((body) => validateWidgetSettings({ site_url: body.site_url, settings: null })),
    async (req, res) => {
      const user: UserProfile = (req as any).user;
      const { site_url } = req.body;

      try {
        const site = await findSiteByURL(site_url);

        if (site?.user_id !== user.id) {
          return res.status(403).json({ error: 'User does not own this site' });
        }

        const widgetSettings = await getWidgetSettingsBySiteId(site?.id);
        let response = widgetSettings?.settings || {};

        res.status(200).json({ settings: response });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
      }
    },
  );

  app.post('/create-checkout-session', strictLimiter, isAuthenticated, validateBody(validateCreateCheckoutSession), async (req, res) => {
    const { planName, billingInterval, returnUrl, domainId, domain, cardTrial, promoCode } = req.body;

    const user: UserProfile = (req as any).user;
    const site = await findSiteByURL(domain);

    if (!site || site.user_id !== user.id) {
      return res.status(403).json({ error: 'User does not own this domain' });
    }

    try {
      const [price, customers] = await Promise.all([
        findProductAndPriceByType(planName, billingInterval),
        stripe.customers.list({
          email: user.email,
          limit: 1,
        }),
      ]);

      let customer;
      let subscriptions;

      if (customers.data.length > 0) {
        customer = customers.data[0];
        subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          limit: 100,
        });
      } else {
        customer = await stripe.customers.create({
          email: user.email,
        });
      }

      let promoCodeData: Stripe.PromotionCode[];

      if (promoCode && promoCode.length > 0 && typeof promoCode?.[0] != 'number') {
        const validCodesData: Stripe.PromotionCode[] = [];
        const invalidCodes: string[] = [];

        for (const code of promoCode) {
          const found = await findPromo(stripe, code);
          if (found) {
            validCodesData.push(found);
          } else {
            invalidCodes.push(code);
          }
        }

        if (invalidCodes.length > 0) {
          return res.json({
            valid: false,
            error: `Invalid Promo Code(s): ${invalidCodes.join(', ')}`,
          });
        }

        promoCodeData = validCodesData;
      }

      let session: any = {};
      if (typeof promoCode?.[0] == 'number' || (promoCodeData && promoCodeData[0]?.coupon.valid && promoCodeData[0]?.active && APP_SUMO_COUPON_IDS.includes(promoCodeData[0].coupon?.id))) {
        const [{ orderedCodes, numPromoSites }, tokenUsed] = await Promise.all([appSumoPromoCount(subscriptions, promoCode, user.id), getUserTokens(user.id)]);

        console.log('promo');
        const { lastCustomCode, nonCustomCodes } = await customTokenCount(user.id, tokenUsed || []);

        // This will work on for AppSumo coupons, we allow use of coupons that should only work for the app sumo tier plans and we manually apply the discount according to new plan (single)

        const subscription = await stripe.subscriptions.create({
          customer: customer.id,
          items: [{ price: price.price_stripe_id, quantity: 1 }],
          expand: ['latest_invoice.payment_intent'],
          coupon: APP_SUMO_DISCOUNT_COUPON,
          metadata: {
            domainId: domainId,
            userId: user.id,
            maxDomains: 1,
            usedDomains: 1,
          },
          description: `Plan for ${domain}(${lastCustomCode ? [lastCustomCode, ...nonCustomCodes] : tokenUsed.length ? tokenUsed : orderedCodes})`,
        });

        const cleanupPromises = [expireUsedPromo(numPromoSites, stripe, orderedCodes, user.id, user.email)];

        try {
          const previous_plan = await getSitePlanBySiteId(Number(domainId));
          cleanupPromises.push(deleteTrialPlan(previous_plan.id).then(() => {}));
        } catch (error) {}

        await Promise.all(cleanupPromises);

        await createSitesPlan(Number(user.id), String(subscription.id), planName, billingInterval, Number(domainId), 'appsumo');

        console.log('New Sub created');

        res.status(200).json({ success: true });

        return;
      } else if (promoCode && promoCode.length > 0) {
        // Coupon is not valid or not the app sumo promo
        return res.json({ valid: false, error: 'Invalid promo code' });
      } else if (cardTrial) {
        console.log('trial');
        session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          mode: 'subscription',
          line_items: [
            {
              price: price.price_stripe_id,
              quantity: 1,
            },
          ],
          customer: customer.id,
          allow_promotion_codes: true,
          success_url: `${returnUrl}`,
          cancel_url: returnUrl,
          metadata: {
            domainId: domainId,
            userId: user.id,
            updateMetaData: 'true',
          },
          subscription_data: {
            trial_period_days: 30,
            metadata: {
              domainId: domainId,
              userId: user.id,
              updateMetaData: 'true',
            },
            description: `Plan for ${domain}`,
          },
        });
      } else {
        console.log('normal');

        if (subscriptions.data.length > 0) {
          console.log('setup intent only');
          session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'setup',
            customer: customer.id,
            success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`, // you can include the session id to later verify the setup
            cancel_url: returnUrl,
            metadata: {
              price_id: price.price_stripe_id,
              domainId: domainId,
              domain: domain,
              userId: user.id,
              updateMetaData: 'true',
            },
          });
        } else {
          console.log('checkout intent');
          session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'subscription',
            line_items: [
              {
                price: price.price_stripe_id,
                quantity: 1,
              },
            ],
            customer: customer.id,
            allow_promotion_codes: true,
            success_url: `${returnUrl}`,
            cancel_url: returnUrl,
            metadata: {
              domainId: domainId,
              userId: user.id,
              updateMetaData: 'true',
            },
            subscription_data: {
              metadata: {
                domainId: domainId,
                userId: user.id,
                updateMetaData: 'true',
              },
              description: `Plan for ${domain}`,
            },
          });
        }
      }

      res.status(303).json({ url: session.url });
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/cancel-site-subscription', strictLimiter, isAuthenticated, validateBody(validateCancelSiteSubscription), async (req, res) => {
    const { domainId, domainUrl, status, cancelReason, otherReason } = req.body;

    let previous_plan: any[];
    let stripeCustomerId: string | null = null;

    const user: UserProfile = (req as any).user;
    const site = await findSiteByURL(domainUrl);

    if (!site || site.user_id !== user.id) {
      return res.status(403).json({ error: 'User does not own this domain' });
    }

    try {
      previous_plan = await getAnySitePlanBySiteId(Number(domainId));

      // Get stripe customer ID for feedback recording
      if (previous_plan && previous_plan.length > 0) {
        stripeCustomerId = previous_plan[0].customerId;
      }
    } catch (error) {
      console.log('err = ', error);
    }

    if (status != 'Active' && status != 'Life Time') {
      try {
        if (previous_plan && previous_plan.length > 0) {
          for (const plan of previous_plan) {
            if (plan.subscriptionId == 'Trial') {
              await deleteTrialPlan(plan.id);
            } else {
              let errorCount = 0;
              try {
                await deleteExpiredSitesPlan(plan.id);
              } catch (error) {
                errorCount++;
              }

              if (errorCount == 0) {
                try {
                  await deleteExpiredSitesPlan(plan.id, true);
                } catch (error) {
                  errorCount++;
                }
              }

              if (errorCount == 2) {
                return res.status(500).json({ error: 'Error deleting expired sites plan' });
              }
            }
          }
        }
      } catch (error) {
        console.log('error deleting site by url', error);
        return res.status(500).json({ error: error.message });
      }
    } else {
      try {
        // Iterate through each plan in previous_plan array
        if (previous_plan && previous_plan.length > 0) {
          for (const plan of previous_plan) {
            if (plan.subscriptionId == 'Trial') {
              await deleteTrialPlan(plan.id);
            } else {
              await deleteSitesPlan(plan.id);
            }
          }
        }
      } catch (error) {
        console.log('err = ', error);
        return res.status(500).json({ error: error });
      }
    }

    try {
      await deleteSiteWithRelatedRecords(domainUrl, user.id);
    } catch (error) {
      console.error('Error deleting site:', error);
      return res.status(500).json({ error: 'Failed to delete site' });
    }

    // Record cancel feedback if provided
    if (cancelReason) {
      try {
        const feedbackData: CancelFeedbackProps = {
          user_id: Number(user.id),
          user_feedback: cancelReason === 'other' ? otherReason : cancelReason,
          site_url: domainUrl,
          stripe_customer_id: stripeCustomerId,
          site_status_on_cancel: status,
          deleted_at: new Date(),
        };

        await addCancelFeedback(feedbackData);
        console.log('Cancel feedback recorded successfully');
      } catch (feedbackError) {
        console.error('Error recording cancel feedback:', feedbackError);
      }
    }

    return res.status(200).json({ success: true });
  });

  app.post('/create-subscription', strictLimiter, isAuthenticated, validateBody(validateCreateSubscription), async (req, res) => {
    const { planName, billingInterval, domainId, domainUrl, cardTrial, promoCode } = req.body;

    const user: UserProfile = (req as any).user;
    const site = await findSiteByURL(domainUrl);

    if (!site || site.user_id !== user.id) {
      return res.status(403).json({ error: 'User does not own this domain' });
    }

    const [price, sites, customers] = await Promise.all([
      findProductAndPriceByType(planName, billingInterval),
      getSitesPlanByUserId(Number(user.id)),
      stripe.customers.list({
        email: user.email,
        limit: 1,
      }),
    ]);

    const sub_id = sites[0]?.subcriptionId;

    let no_sub = false;
    let subscription;

    if (sub_id == undefined) {
      no_sub = true;
    } else {
      try {
        subscription = (await stripe.subscriptions.retrieve(sub_id, { active: true })) as Stripe.Subscription;
      } catch (error) {
        // console.log("error",error);
        no_sub = true;
      }
    }

    try {
      let customer;

      // Check if customer exists
      if (customers.data.length > 0) {
        customer = customers.data[0];
      } else {
        // console.log("customer not found");
        res.status(404);
      }

      const [subscriptions, price_data] = await Promise.all([
        stripe.subscriptions.list({
          customer: customer.id,
          limit: 100,
        }),
        stripe.prices.retrieve(String(price.price_stripe_id), { expand: ['tiers'] }),
      ]);

      if (subscriptions.data.length > 0) {
        subscription = subscriptions.data[0];
        no_sub = false;
      }

      if (!price_data?.tiers || price_data?.tiers?.length == 0) {
        no_sub = true;
        console.log('no tiers');
      }
      let cleanupPromises: Promise<void>[] = [];
      if (no_sub) {
        let promoCodeData: Stripe.PromotionCode[];

        if (promoCode && promoCode.length > 0 && typeof promoCode[0] != 'number') {
          const validCodesData: Stripe.PromotionCode[] = [];
          const invalidCodes: string[] = [];

          // Process each code sequentially (you can also use Promise.all if you prefer parallel execution)
          for (const code of promoCode) {
            const found = await findPromo(stripe, code);
            if (found) {
              validCodesData.push(found);
            } else {
              invalidCodes.push(code);
            }
          }

          if (invalidCodes.length > 0) {
            return res.json({
              valid: false,
              error: `Invalid Promo Code(s): ${invalidCodes.join(', ')}`,
            });
          }

          // Now, validCodesData contains all valid promo code objects.
          promoCodeData = validCodesData;
        }

        if (typeof promoCode[0] == 'number' || (promoCodeData && promoCodeData[0].coupon.valid && promoCodeData[0].active && APP_SUMO_COUPON_IDS.includes(promoCodeData[0].coupon.id))) {
          const [{ orderedCodes, numPromoSites }, tokenUsed] = await Promise.all([appSumoPromoCount(subscriptions, promoCode, user.id), getUserTokens(user.id)]);

          const { lastCustomCode, nonCustomCodes } = await customTokenCount(user.id, tokenUsed);

          subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ price: price.price_stripe_id, quantity: 1 }],
            expand: ['latest_invoice.payment_intent'],
            coupon: APP_SUMO_DISCOUNT_COUPON,
            default_payment_method: customer.invoice_settings.default_payment_method,
            metadata: {
              domainId: domainId,
              userId: user.id,
              maxDomains: 1,
              usedDomains: 1,
            },
            description: `Plan for ${domainUrl}(${lastCustomCode ? [lastCustomCode, ...nonCustomCodes] : tokenUsed.length ? tokenUsed : orderedCodes})`,
          });

          // Parallel execution for cleanup operations
          cleanupPromises = [expireUsedPromo(numPromoSites, stripe, orderedCodes, user.id, user.email)];
        } else if (promoCode && promoCode.length > 0) {
          // Coupon is not valid or not the app sumo promo
          return res.json({ valid: false, error: 'Invalid promo code' });
        } else if (cardTrial) {
          subscription = await stripe.subscriptions.create({
            trial_period_days: 30,
            customer: customer.id,
            items: [{ price: price.price_stripe_id, quantity: 1 }],
            expand: ['latest_invoice.payment_intent'],
            default_payment_method: customer.invoice_settings.default_payment_method,
            metadata: {
              domainId: domainId,
              userId: user.id,
              maxDomains: 1,
              usedDomains: 1,
            },
            description: `Plan for ${domainUrl}`,
          });
        } else {
          subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ price: price.price_stripe_id, quantity: 1 }],
            expand: ['latest_invoice.payment_intent'],
            default_payment_method: customer.invoice_settings.default_payment_method,
            metadata: {
              domainId: domainId,
              userId: user.id,
              maxDomains: 1,
              usedDomains: 1,
            },
            description: `Plan for ${domainUrl}`,
          });
        }

        try {
          const previous_plan = await getSitePlanBySiteId(Number(domainId));
          cleanupPromises.push(deleteTrialPlan(previous_plan.id).then(() => {}));
        } catch (error) {
          // Previous plan doesn't exist, continue
        }

        await Promise.all(cleanupPromises);

        if (promoCode.length > 0) {
          await createSitesPlan(Number(user.id), String(subscription.id), planName, billingInterval, Number(domainId), 'appsumo');
        } else {
          await createSitesPlan(Number(user.id), String(subscription.id), planName, billingInterval, Number(domainId), '');
        }

        console.log('New Sub created');

        res.status(200).json({ success: true });
      } else {
        if ('usedDomains' in subscription.metadata) {
          const UsedDomains = Number(subscription.metadata['usedDomains']);
          const MaxDomains = Number(subscription.metadata['maxDomains']);
          // console.log('UD', UsedDomains);
          // console.log(subscription.metadata);
          if (UsedDomains >= Number(subscription.metadata['maxDomains'])) {
            // res.status(500).json({ error: 'Your Plan Limit has Fulfilled' }); // old code

            let metaData: any = subscription.metadata;

            metaData['usedDomains'] = Number(UsedDomains + 1);
            metaData['updateMetaData'] = true;

            const newQuant = subscription.items.data[0].quantity + 1;

            await stripe.subscriptions.update(subscription.id, {
              metadata: metaData, // Update the metadata
              items: [
                {
                  id: subscription.items.data[0].id, // The subscription item ID
                  quantity: newQuant, // Increment quantity by 5
                },
              ],
            });

            console.log('meta data updated');

            // Parallel execution for cleanup and site plan creation
            const cleanupPromises = [];

            // Handle previous plan deletion
            try {
              const previous_plan = await getSitePlanBySiteId(Number(domainId));
              cleanupPromises.push(deleteTrialPlan(previous_plan.id).then(() => {}));
            } catch (error) {
              // Previous plan doesn't exist, continue
            }

            // Add site plan creation
            cleanupPromises.push(createSitesPlan(Number(user.id), String(subscription.id), planName, billingInterval, Number(domainId), ''));

            await Promise.all(cleanupPromises);

            res.status(200).json({ success: true });
          } else {
            let metaData: any = subscription.metadata;

            metaData['usedDomains'] = Number(UsedDomains + 1);
            metaData['updateMetaData'] = true;

            await stripe.subscriptions.update(subscription.id, {
              metadata: metaData,
            });

            console.log('meta data updated');

            // Parallel execution for cleanup and site plan creation
            const cleanupPromises = [];

            // Handle previous plan deletion
            try {
              const previous_plan = await getSitePlanBySiteId(Number(domainId));
              cleanupPromises.push(deleteTrialPlan(previous_plan.id).then(() => {}));
            } catch (error) {
              // Previous plan doesn't exist, continue
            }

            // Add site plan creation
            cleanupPromises.push(createSitesPlan(Number(user.id), String(subscription.id), planName, billingInterval, Number(domainId), ''));

            await Promise.all(cleanupPromises);

            console.log('Old Sub created');

            res.status(200).json({ success: true });
          }
        } else {
          res.status(500).json({ error: 'Meta Data Not Configured' });
        }
      }
    } catch (error) {
      console.log('erroring', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/apply-retention-discount', strictLimiter, isAuthenticated, validateBody(validateApplyRetentionDiscount), async (req, res) => {
    const { domainId, status } = req.body;

    const user: UserProfile = (req as any).user;
    const site = await findSiteById(domainId);

    if (!site || site.user_id !== user.id) {
      return res.status(403).json({ error: 'User does not own this domain' });
    }

    try {
      const sitePlan = await getSitePlanBySiteId(Number(domainId));

      if (!sitePlan && status != 'Trial' && status != 'Trial Expired') {
        return res.status(404).json({ error: 'Site plan not found' });
      }

      if (sitePlan?.subscription_id == 'Trial' || status == 'Trial' || status == 'Trial Expired') {
        let customerId = sitePlan?.customerId;

        if (status == 'Trial' || status == 'Trial Expired') {
          const customers = await stripe.customers.list({
            email: user.email,
            limit: 1,
          });

          if (customers.data.length > 0) {
            customerId = customers.data[0].id;
          } else {
            return res.status(400).json({ error: 'Customer not found' });
          }
        }

        const promoCode = await stripe.promotionCodes.create({
          coupon: RETENTION_COUPON_ID,
          max_redemptions: 1,
          active: true,
          customer: customerId,
        });

        return res.status(200).json({
          couponCode: promoCode.code,
          message: 'Coupon code created successfully',
        });
      } else {
        // Apply existing coupon to active subscription
        try {
          const subscription = await stripe.subscriptions.retrieve(sitePlan.subcriptionId);

          if (!subscription || subscription.status !== 'active') {
            return res.status(400).json({ error: 'Active subscription not found' });
          }

          await stripe.subscriptions.update(subscription.id, {
            coupon: RETENTION_COUPON_ID,
          });

          return res.status(200).json({
            message: '5% discount applied to subscription successfully',
          });
        } catch (subscriptionError) {
          console.error('Error applying discount to subscription:', subscriptionError);
          return res.status(500).json({ error: 'Failed to apply discount to subscription' });
        }
      }
    } catch (error) {
      console.error('Error applying retention discount:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/check-customer', moderateLimiter, isAuthenticated, async (req, res) => {
    const user: UserProfile = (req as any).user;

    let plan_name;
    let interval;

    try {
      const plans = await getSitesPlanByUserId(user.id);
      if (plans.length > 0) {
        for (let i = 0; i < plans.length; i++) {
          let plan = plans[i];
          if (plan.subscription_id !== 'Trial') {
            let prodId = plan.productId;
            let priceId = plan.priceId;
            const prod = await findProductById(Number(prodId));
            const price = await findPriceById(Number(priceId));
            plan_name = prod.type;
            interval = price.type;
            break; // This will exit the loop
          }
        }
      }
    } catch (error) {}

    try {
      // Search for an existing customer by email
      const customers = await stripe.customers.list({
        email: user.email,
        limit: 1,
      });

      let customer;

      const userAppSumoTokens = await getUserTokens(user.id);

      const hasCustomInfinityToken = userAppSumoTokens.includes('customInfinity');

      let maxSites = 0;

      if (!hasCustomInfinityToken) {
        const { lastCustomCode, nonCustomCodes } = await customTokenCount(user.id, userAppSumoTokens);

        if (lastCustomCode) {
          const customCode = lastCustomCode.match(/^custom(\d+)$/);
          maxSites = Number(customCode[1]) + nonCustomCodes.length;
        } else {
          maxSites = nonCustomCodes.length;
        }
      }
      // Check if customer exists
      if (customers.data.length > 0) {
        customer = customers.data[0];

        try {
          const trial_subs = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'trialing', // Retrieve all statuses to filter manually
            limit: 100,
          });

          const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'active', // Retrieve all statuses to filter manually
            limit: 100,
          });

          let price_id;
          let price: Stripe.Price;

          if (subscriptions.data.length > 0) {
            price_id = (subscriptions.data[0] as Stripe.Subscription).items.data[0].price;

            price = await stripe.prices.retrieve(price_id.id, {
              expand: ['tiers'], // Explicitly expand the tiers
            });
          }

          // handle trial output and show trial sub seperately
          if (trial_subs?.data?.length) {
            const prod = await stripe.products.retrieve(String(trial_subs?.data[0]?.plan?.product));

            const trialEndTimestamp = trial_subs?.data[0]?.trial_end; // Unix timestamp
            const currentTimestamp = Math.floor(Date.now() / 1000); // Current time in seconds

            const daysRemaining = Math.ceil((trialEndTimestamp - currentTimestamp) / (60 * 60 * 24));

            if (!price || price?.tiers?.length > 0) {
              res.status(200).json({ tierPlan: true, isCustomer: true, plan_name: prod.name, interval: trial_subs.data[0].plan.interval, submeta: trial_subs.data[0].metadata, card: customers?.data[0]?.invoice_settings.default_payment_method, expiry: daysRemaining });
            } else {
              const monthlyTrialSubs: Array<{ id: string; description: any; trial_end: number | null }> = [];
              const yearlyTrialSubs: Array<{ id: string; description: any; trial_end: number | null }> = [];

              const monthlySubs: Array<{ id: string; description: any }> = [];
              const yearlySubs: Array<{ id: string; description: any }> = [];

              trial_subs.data.forEach((subscription: any) => {
                // Retrieve the recurring interval from the first subscription item
                const recurringInterval = subscription.items.data[0]?.price?.recurring?.interval;

                // Build an object that includes the subscription's description along with other properties
                const outputObj = {
                  id: subscription.id,
                  description: subscription.description, //subscription.metadata.description
                  trial_end: subscription.trial_end,
                };

                // Categorize into monthly or yearly based on the recurring interval
                if (recurringInterval === 'month') {
                  monthlyTrialSubs.push(outputObj);
                } else if (recurringInterval === 'year') {
                  yearlyTrialSubs.push(outputObj);
                }
              });

              subscriptions.data.forEach((subscription: any) => {
                // Retrieve the recurring interval from the first subscription item
                const recurringInterval = subscription.items.data[0]?.price?.recurring?.interval;

                // Create an output object with the desired properties
                const outputObj = {
                  id: subscription.id,
                  description: subscription?.description,
                };

                // Push the subscription into the appropriate array based on the interval
                if (recurringInterval === 'month') {
                  monthlySubs.push(outputObj);
                } else if (recurringInterval === 'year') {
                  yearlySubs.push(outputObj);
                }
              });

              const trial_sub_data = { monthly: monthlyTrialSubs, yearly: yearlyTrialSubs };
              const regular_sub_data = { monthly: monthlySubs, yearly: yearlySubs };

              let appSumoCount = 0;
              const uniquePromoCodes = new Set<string>();

              for (const subs of Object.values(regular_sub_data)) {
                for (const sub of subs) {
                  const match = sub.description?.match(/\(([^)]*)\)$/);
                  if (match) {
                    appSumoCount++;

                    // split in case there are multiple codes in the ()
                    const codesInDesc = match[1]
                      .split(',')
                      .map((c: string) => c.trim())
                      .filter((c: any) => c.length > 0);

                    codesInDesc.forEach((code: any) => uniquePromoCodes.add(code));
                  }
                }
              }

              res.status(200).json({
                trial_subs: JSON.stringify(trial_sub_data),
                subscriptions: JSON.stringify(regular_sub_data),
                isCustomer: true,
                plan_name: prod.name,
                interval: trial_subs.data[0].plan.interval,
                submeta: trial_subs.data[0].metadata,
                card: customers?.data[0]?.invoice_settings.default_payment_method,
                expiry: daysRemaining,
                appSumoCount: appSumoCount,
                codeCount: maxSites > 0 ? maxSites : userAppSumoTokens.length ? userAppSumoTokens.length : uniquePromoCodes.size,
                infinityToken: hasCustomInfinityToken,
              });
            }
          } else {
            const prod = await stripe.products.retrieve(String(subscriptions.data[0]?.plan?.product));

            if (!price || price?.tiers?.length > 0) {
              res.status(200).json({ tierPlan: true, isCustomer: true, plan_name: prod.name, interval: subscriptions.data[0].plan.interval, submeta: subscriptions.data[0].metadata, card: customers?.data[0]?.invoice_settings.default_payment_method });
            } else {
              // New Pricing, return all subs

              const monthlySubs: Array<{ id: string; description: any }> = [];
              const yearlySubs: Array<{ id: string; description: any }> = [];

              subscriptions.data.forEach((subscription: any) => {
                // Retrieve the recurring interval from the first subscription item
                const recurringInterval = subscription.items.data[0]?.price?.recurring?.interval;

                // Create an output object with the desired properties
                const outputObj = {
                  id: subscription.id,
                  description: subscription?.description,
                };

                // Push the subscription into the appropriate array based on the interval
                if (recurringInterval === 'month') {
                  monthlySubs.push(outputObj);
                } else if (recurringInterval === 'year') {
                  yearlySubs.push(outputObj);
                }
              });
              const regular_sub_data = { monthly: monthlySubs, yearly: yearlySubs };

              let appSumoCount = 0;
              const uniquePromoCodes = new Set<string>();

              for (const subs of Object.values(regular_sub_data)) {
                for (const sub of subs) {
                  const match = sub.description?.match(/\(([^)]*)\)$/);
                  if (match) {
                    appSumoCount++;

                    // split in case there are multiple codes in the ()
                    const codesInDesc = match[1]
                      .split(',')
                      .map((c: string) => c.trim())
                      .filter((c: any) => c.length > 0);

                    codesInDesc.forEach((code: any) => uniquePromoCodes.add(code));
                  }
                }
              }

              res.status(200).json({
                subscriptions: JSON.stringify(regular_sub_data),
                isCustomer: true,
                plan_name: prod.name,
                interval: subscriptions.data[0].plan.interval,
                submeta: subscriptions.data[0].metadata,
                card: customers?.data[0]?.invoice_settings.default_payment_method,
                appSumoCount: appSumoCount,
                codeCount: maxSites > 0 ? maxSites : userAppSumoTokens.length ? userAppSumoTokens.length : uniquePromoCodes.size,
                infinityToken: hasCustomInfinityToken,
              });
            }
          }
        } catch (error) {
          // console.log(error);
          // silent fail
          res.status(200).json({ isCustomer: true, plan_name: '', interval: '', card: customers?.data[0]?.invoice_settings.default_payment_method, codeCount: maxSites > 0 ? maxSites : userAppSumoTokens.length, infinityToken: hasCustomInfinityToken });
        }
      } else {
        console.log('no customer');
        res.status(200).json({ isCustomer: false, plan_name: '', interval: '', card: customers?.data[0]?.invoice_settings.default_payment_method, infinityToken: hasCustomInfinityToken, codeCount: maxSites > 0 ? maxSites : userAppSumoTokens.length });
      }
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/get-problem-reports', moderateLimiter, isAuthenticated, async (req, res) => {
    const user: UserProfile = (req as any).user;

    try {
      // Fetch sites by user ID
      const Sites: IUserSites[] = await findSitesByUserId(user.id);

      // Use Promise.all to fetch problem reports for all sites concurrently
      const allReports = (
        await Promise.all(
          Sites.map(async (site: IUserSites) => {
            const reports = await getProblemReportsBySiteId(site.id);
            return reports; // Return reports for each site
          }),
        )
      ).flat(); // Flatten the array of arrays into a single array

      res.status(200).send(allReports);
    } catch (error) {
      console.error('Error fetching problem reports:', error);
      res.status(500).send('Cannot fetch reports');
    }
  });

  app.post('/translate', strictLimiter, isAuthenticated, async (req: Request, res: Response) => {
    const { issues, toLang = 'en' } = req.body;

    if (!Array.isArray(issues)) {
      return res.status(400).json({ error: 'Invalid or missing "issues" array' });
    }

    const fieldsToTranslate = ['code', 'message', 'recommended_action'];
    const textsToTranslate: { issueIndex: number; field: string; text: string }[] = [];

    issues.forEach((issue: Issue, idx: number) => {
      fieldsToTranslate.forEach((field) => {
        if (issue[field]) {
          textsToTranslate.push({ issueIndex: idx, field, text: issue[field] });
        }
      });
    });

    // Skip translation if language is English
    if (!toLang || toLang.toLowerCase() === 'en') {
      return res.json(issues);
    }

    try {
      const response = await axios.post(
        `${endpoint}translate?api-version=3.0&to=${toLang}`,
        textsToTranslate.map((item) => ({ Text: item.text })),
        {
          headers: {
            'Ocp-Apim-Subscription-Key': subscriptionKey,
            'Ocp-Apim-Subscription-Region': region,
            'Content-Type': 'application/json',
          },
        },
      );

      const translatedIssues = issues.map((issue) => ({ ...issue }));

      response.data.forEach((translation: any, idx: number) => {
        const { issueIndex, field } = textsToTranslate[idx];
        translatedIssues[issueIndex][field] = translation.translations[0].text;
      });

      return res.json(translatedIssues);
    } catch (err: any) {
      console.error('Translation error:', err?.response?.data || err.message);
      return res.status(500).json({ error: 'Translation failed' });
    }
  });

  app.post('/translate-text', strictLimiter, isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { issues, toLang = 'en' } = req.body;

      if (!Array.isArray(issues) || issues.length === 0) {
        return res.status(400).json({ error: 'Invalid or missing "issues" array' });
      }

      if (!toLang || toLang.toLowerCase() === 'en') {
        // No translation needed — return original input format
        return res.json(issues);
      }

      // Extract texts from the `code` field
      const texts = issues.map((item: { code: string }) => item.code);

      // Send to Microsoft Translator
      const response = await axios.post(
        `${endpoint}translate?api-version=3.0&to=${toLang}`,
        texts.map((text) => ({ Text: text })),
        {
          headers: {
            'Ocp-Apim-Subscription-Key': subscriptionKey,
            'Ocp-Apim-Subscription-Region': region,
            'Content-Type': 'application/json',
          },
        },
      );

      const translated = response.data.map((item: any) => ({
        code: item.translations[0].text,
      }));

      return res.json(translated);
    } catch (err: any) {
      console.error('Translation failed:', err?.response?.data || err.message);
      return res.status(500).json({ error: 'Translation failed' });
    }
  });

  app.post('/form', requireJsonContent, emailLimiter, moderateLimiter, async (req, res) => {
    const validateResult = emailValidation(req.body.email);

    if (Array.isArray(validateResult) && validateResult.length) {
      return res.status(400).json({ error: validateResult.map((it) => it.message).join(',') });
    }

    try {
      await sendMail(
        req.body.email,
        'Welcome to Webability',
        `
            <html>
            <head>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 20px;
                    color: #333333;
                }
                .script-box {
                    background-color: #f4f4f4;
                    border: 1px solid #dddddd;
                    padding: 15px;
                    overflow: auto;
                    font-family: monospace;
                    margin-top: 20px;
                    white-space: pre-wrap;
                }
                .instructions {
                    margin-bottom: 10px;
                }
            </style>
        </head>
        <body>
            <h1>Welcome to Webability!</h1>
            <p class="instructions">To get started with Webability on your website, please follow these steps:</p>
            <ol>
                <li>Copy the script code provided below.</li>
                <li>Paste it into the HTML of your website, preferably near the closing &lt;/body&gt; tag.</li>
            </ol>
            <div class="script-box">
                &lt;script src="https://widget.webability.io/widget.min.js" data-asw-position="bottom-left" data-asw-lang="en" defer&gt;&lt;/script&gt;
            </div>
            <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
            <p>Thank you for choosing Webability!</p>
        </body>
            </html>
        `,
      );

      return res.status(200).json({ success: true, message: 'Email sent successfully' });
    } catch (error) {
      console.error('Error sending email:', error);
      return res.status(500).json({ error: 'Failed to send email' });
    }
  });

  app.post('/subscribe-newsletter', requireJsonContent, emailLimiter, moderateLimiter, async (req, res) => {
    try {
      const { email } = req.body;
      const validateResult = emailValidation(email);

      if (Array.isArray(validateResult) && validateResult.length) {
        return res.status(400).json({ error: validateResult.map((it) => it.message).join(',') });
      }

      await addNewsletterSub(email);
      res.status(200).json({ message: 'Subscription successful' });
    } catch (error) {
      console.error('Error subscribing to newsletter:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  const { rateLimitDirectiveTypeDefs, rateLimitDirectiveTransformer } = rateLimitDirective({
    keyGenerator: (_: any, __: any, context: any): string => {

      // Priority 1: Use authenticated user ID for better isolation
      if (context.user?.id) {
        return `user:${context.user.id}`;
      }
      
      // Priority 2: Try multiple IP sources
      const ip = context.ip || context.req?.ip || context.req?.connection?.remoteAddress || context.req?.socket?.remoteAddress;
      
      if (ip && ip !== 'unknown' && ip !== '::1' && ip !== '127.0.0.1') {
        return `ip:${ip}`;
      }
      
      // Priority 3: Create fingerprint from available headers (for edge cases)
      const req = context.req;
      const userAgent = req?.headers?.['user-agent']?.slice(0, 50) || '';
      const acceptLanguage = req?.headers?.['accept-language']?.slice(0, 30) || '';
      const acceptEncoding = req?.headers?.['accept-encoding']?.slice(0, 30) || '';
      
      // Create a hash-like fingerprint for uniqueness
      const fingerprint = Buffer.from(`${userAgent}-${acceptLanguage}-${acceptEncoding}`)
        .toString('base64')
        .slice(0, 20);
      
      return `fingerprint:${fingerprint}`;
    },
    
    onLimit: (_, directiveArgs: any): Error => {
      const customMessage = directiveArgs.message || 'Too many requests, please try again later.';

      return new Error(customMessage);
    },
  });

  let schema = makeExecutableSchema({
    typeDefs: [
      rateLimitDirectiveTypeDefs,
      RootSchema,
    ],
    resolvers: RootResolver as IResolvers[],
  });
  
  schema = rateLimitDirectiveTransformer(schema);

  const serverGraph = new ApolloServer({
    schema,
    playground: IS_LOCAL_DEV,
    formatError: (err) => {
      if (err.message.includes('Not authenticated')) {
        return new Error('Please login to make this action');
      }

      if (process.env.NODE_ENV === 'production') {
        const result = err.message.match(/ValidationError: (.*)/);

        if (result && result[1]) {
          return new Error(result[1]);
        }
      }

      return err;
    },
    plugins: [
      {
        // Add Sentry tracing for GraphQL operations
        requestDidStart(requestContext) {
          const transaction = Sentry.startTransaction({
            op: 'graphql.request',
            name: requestContext.request.operationName || 'GraphQL Query',
          });

          // Store the transaction on the request context
          requestContext.context.sentryTransaction = transaction;

          return {
            didEncounterErrors(ctx) {
              // Capture any errors that occur during operation execution
              if (!ctx.operation) return;

              for (const err of ctx.errors) {
                if (err instanceof ApolloError) {
                  continue;
                }

                withScope((scope) => {
                  scope.setTag('kind', ctx.operation.operation);
                  scope.setExtra('query', ctx.request.query);
                  scope.setExtra('variables', ctx.request.variables);

                  if (err.path) {
                    scope.addBreadcrumb({
                      category: 'query-path',
                      message: err.path.join(' > '),
                      level: Severity.Debug,
                    });
                  }

                  // Set the transaction on the scope
                  scope.setSpan(ctx.context.sentryTransaction);

                  const transactionId = ctx.request.http.headers.get('x-transaction-id');
                  if (transactionId) {
                    scope.setTransactionName(transactionId);
                  }

                  captureException(err);
                });
              }
            },

            // Finish the transaction when the request is complete
            willSendResponse(ctx) {
              const transaction = ctx.context.sentryTransaction;
              if (transaction) {
                transaction.finish();
              }
            },
          };
        },
      },
    ],

    context: async ({ req, res }: ContextParams) => {
      const { cookies } = req;
      const bearerToken = cookies.token || null;
      const user = await getUserLogined(bearerToken, res);
      const ip = getIpAddress(req.headers['x-forwarded-for'], req.socket.remoteAddress);
      
      return {
        req,
        res,
        ip,
        user,
      };
    },
  });

  app.use('/graphql', (req, res, next) => {
    // Parse the GraphQL query to determine timeout
    const body = req.body;
    let timeout = 70000; // Default 70 seconds

    // Check if this is the accessibility report query
    if (body && body.query && body.query.includes('getAccessibilityReport')) {
      timeout = 120000; // 5 minutes for accessibility report
    }

    req.setTimeout(timeout);
    res.setTimeout(timeout);
    next();
  });

  app.use('/graphql', express.json({ limit: '5mb' }));
  serverGraph.applyMiddleware({ app, cors: false });

  init({
    dsn: process.env.SENTRY_DSN,
    serverName: process.env.COOLIFY_URL || `http://localhost:${port}`,
    tracesSampleRate: 1.0,
    integrations: [
      // Enable HTTP calls tracing
      new Sentry.Integrations.Http({ tracing: true }),
    ],
    attachStacktrace: true,
  });

  app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
  });
})();
