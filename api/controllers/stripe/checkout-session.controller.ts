import { Request, Response } from 'express'
import Stripe from 'stripe'

import { APP_SUMO_COUPON_IDS, APP_SUMO_DISCOUNT_COUPON } from '../../constants/billing.constant'
import { findProductAndPriceByType } from '../../repository/products.repository'
import { findSiteByURL } from '../../repository/sites_allowed.repository'
import { getSitePlanBySiteId } from '../../repository/sites_plans.repository'
import { UserProfile } from '../../repository/user.repository'
import { getUserTokens } from '../../repository/user_plan_tokens.repository'
import { createSitesPlan, deleteTrialPlan } from '../../services/allowedSites/plans-sites.service'
import findPromo from '../../services/stripe/findPromo'
import { appSumoPromoCount } from '../../utils/appSumoPromoCount'
import { customTokenCount } from '../../utils/customTokenCount'
import { expireUsedPromo } from '../../utils/expireUsedPromo'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY)

export async function createCheckoutSession(req: Request & { user: UserProfile }, res: Response) {
  const { planName, billingInterval, returnUrl, domainId, domain, cardTrial, promoCode } = req.body

  const { user } = req
  const site = await findSiteByURL(domain)

  if (!site || site.user_id !== user.id) {
    return res.status(403).json({ error: 'User does not own this domain' })
  }

  // Check organization_id if user has current organization
  if (user.current_organization_id && site.organization_id !== user.current_organization_id) {
    return res.status(403).json({ error: 'Site does not belong to current organization' })
  }

  try {
    const [price, customers] = await Promise.all([
      findProductAndPriceByType(planName, billingInterval),
      stripe.customers.list({
        email: user.email,
        limit: 1,
      }),
    ])

    let customer
    let subscriptions

    if (customers.data.length > 0) {
      customer = customers.data[0]
      subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        limit: 100,
      })
    } else {
      customer = await stripe.customers.create({
        email: user.email,
      })
    }

    let promoCodeData: Stripe.PromotionCode[]

    if (promoCode && promoCode.length > 0 && typeof promoCode?.[0] !== 'number') {
      const validCodesData: Stripe.PromotionCode[] = []
      const invalidCodes: string[] = []

      for (const code of promoCode) {
        const found = await findPromo(stripe, code)
        if (found) {
          validCodesData.push(found)
        } else {
          invalidCodes.push(code)
        }
      }

      if (invalidCodes.length > 0) {
        return res.json({
          valid: false,
          error: `Invalid Promo Code(s): ${invalidCodes.join(', ')}`,
        })
      }

      promoCodeData = validCodesData
    }

    let session: any = {}
    if (typeof promoCode?.[0] === 'number' || (promoCodeData && promoCodeData[0]?.coupon.valid && promoCodeData[0]?.active && APP_SUMO_COUPON_IDS.includes(promoCodeData[0].coupon?.id))) {
      if (!user.current_organization_id) {
        return res.status(400).json({ error: 'User has no current organization' })
      }

      const [{ orderedCodes, numPromoSites }, tokenUsed] = await Promise.all([appSumoPromoCount(subscriptions, promoCode, user.id, user.current_organization_id), getUserTokens(user.id, user.current_organization_id)])

      console.log('promo')
      const { lastCustomCode, nonCustomCodes } = await customTokenCount(user.id, tokenUsed || [])

      // This will work on for AppSumo coupons, we allow use of coupons that should only work for the app sumo tier plans and we manually apply the discount according to new plan (single)

      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: price.price_stripe_id, quantity: 1 }],
        expand: ['latest_invoice.payment_intent'],
        coupon: APP_SUMO_DISCOUNT_COUPON,
        metadata: {
          domainId,
          userId: user.id,
          maxDomains: 1,
          usedDomains: 1,
        },
        description: `Plan for ${domain}(${lastCustomCode ? [lastCustomCode, ...nonCustomCodes] : tokenUsed.length ? tokenUsed : orderedCodes})`,
      })

      const cleanupPromises = [expireUsedPromo(numPromoSites, stripe, orderedCodes, user.id, user.current_organization_id, user.email)]

      try {
        const previous_plan = await getSitePlanBySiteId(Number(domainId))
        cleanupPromises.push(deleteTrialPlan(previous_plan.id).then(() => {}))
      } catch {}

      await Promise.all(cleanupPromises)

      await createSitesPlan(Number(user.id), String(subscription.id), planName, billingInterval, Number(domainId), 'appsumo')

      console.log('New Sub created')

      res.status(200).json({ success: true })

      return
    }
    if (promoCode && promoCode.length > 0) {
      // Coupon is not valid or not the app sumo promo
      return res.json({ valid: false, error: 'Invalid promo code' })
    }
    if (cardTrial) {
      console.log('trial')
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
          domainId,
          userId: user.id,
          updateMetaData: 'true',
        },
        subscription_data: {
          trial_period_days: 30,
          metadata: {
            domainId,
            userId: user.id,
            updateMetaData: 'true',
          },
          description: `Plan for ${domain}`,
        },
      })
    } else {
      console.log('normal')

      if (subscriptions.data.length > 0) {
        console.log('setup intent only')
        session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          mode: 'setup',
          customer: customer.id,
          success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`, // you can include the session id to later verify the setup
          cancel_url: returnUrl,
          metadata: {
            price_id: price.price_stripe_id,
            domainId,
            domain,
            userId: user.id,
            updateMetaData: 'true',
          },
        })
      } else {
        console.log('checkout intent')
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
            domainId,
            userId: user.id,
            updateMetaData: 'true',
          },
          subscription_data: {
            metadata: {
              domainId,
              userId: user.id,
              updateMetaData: 'true',
            },
            description: `Plan for ${domain}`,
          },
        })
      }
    }

    res.status(303).json({ url: session.url })
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: error.message })
  }
}
