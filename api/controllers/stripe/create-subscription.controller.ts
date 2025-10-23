import { Request, Response } from 'express'
import Stripe from 'stripe'

import { APP_SUMO_COUPON_IDS, APP_SUMO_DISCOUNT_COUPON, REWARDFUL_COUPON } from '../../constants/billing.constant'
import { findProductAndPriceByType } from '../../repository/products.repository'
import { findSiteByURL } from '../../repository/sites_allowed.repository'
import { getSitePlanBySiteId, getSitesPlanByUserId } from '../../repository/sites_plans.repository'
import { getUserTokens } from '../../repository/user_plan_tokens.repository'
import { findUserById } from '../../repository/user.repository'
import { createSitesPlan, deleteTrialPlan } from '../../services/allowedSites/plans-sites.service'
import findPromo from '../../services/stripe/findPromo'
import { appSumoPromoCount } from '../../utils/appSumoPromoCount'
import { customTokenCount } from '../../utils/customTokenCount'
import { expireUsedPromo } from '../../utils/expireUsedPromo'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY)

export async function createSubscription(req: Request, res: Response) {
  const { planName, billingInterval, domainId, domainUrl, cardTrial, promoCode } = req.body

  const { user } = req as any
  const site = await findSiteByURL(domainUrl)

  if (!site || site.user_id !== user.id) {
    return res.status(403).json({ error: 'User does not own this domain' })
  }

  // If user doesn't have referral in session but might have it in database, reload it
  if (!user.referral) {
    try {
      const freshUser = await findUserById(user.id)
      if (freshUser.referral) {
        user.referral = freshUser.referral
        console.log('[REWARDFUL] Loaded existing referral code from database:', freshUser.referral)
      }
    } catch (error) {
      console.error('[REWARDFUL] Failed to reload user referral code:', error)
    }
  }

  const [price, sites, customers] = await Promise.all([
    findProductAndPriceByType(planName, billingInterval),
    getSitesPlanByUserId(Number(user.id)),
    stripe.customers.list({
      email: user.email,
      limit: 1,
    }),
  ])

  const sub_id = sites[0]?.subcriptionId

  let no_sub = false
  let subscription

  if (sub_id == undefined) {
    no_sub = true
  } else {
    try {
      subscription = (await stripe.subscriptions.retrieve(sub_id, { active: true })) as Stripe.Subscription
    } catch {
      no_sub = true
    }
  }

  try {
    let customer

    // Check if customer exists
    if (customers.data.length > 0) {
      customer = customers.data[0]
    } else {
      return res.status(404).json({ error: 'Customer not found' })
    }

    const [subscriptions, price_data] = await Promise.all([
      stripe.subscriptions.list({
        customer: customer.id,
        limit: 100,
      }),
      stripe.prices.retrieve(String(price.price_stripe_id), { expand: ['tiers'] }),
    ])

    if (subscriptions.data.length > 0) {
      subscription = subscriptions.data[0]
      no_sub = false
    }

    if (!price_data?.tiers || price_data?.tiers?.length == 0) {
      no_sub = true
      console.log('no tiers')
    }

    let cleanupPromises: Promise<void>[] = []

    if (no_sub) {
      let promoCodeData: Stripe.PromotionCode[] = []

      if (promoCode && promoCode.length > 0 && typeof promoCode[0] !== 'number') {
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

      if (typeof promoCode[0] === 'number' || (promoCodeData && promoCodeData[0]?.coupon.valid && promoCodeData[0]?.active && APP_SUMO_COUPON_IDS.includes(promoCodeData[0].coupon.id))) {
        if (!user.current_organization_id) {
          return res.status(400).json({ error: 'User has no current organization' })
        }

        const [{ orderedCodes, numPromoSites }, tokenUsed] = await Promise.all([appSumoPromoCount(subscriptions, promoCode, user.id, user.current_organization_id), getUserTokens(user.id, user.current_organization_id)])

        const { lastCustomCode, nonCustomCodes } = await customTokenCount(user.id, tokenUsed)

        // Add Rewardful referral ID if present
        if (user.referral) {
          console.log('[REWARDFUL] Creating subscription with referral:', user.referral)
        } else {
          console.log('[REWARDFUL] No referral code found for user')
        }

        subscription = await stripe.subscriptions.create({
          customer: customer.id,
          items: [{ price: price.price_stripe_id, quantity: 1 }],
          expand: ['latest_invoice.payment_intent'],
          coupon: APP_SUMO_DISCOUNT_COUPON,
          default_payment_method: customer.invoice_settings.default_payment_method,
          metadata: {
            domainId,
            userId: user.id,
            maxDomains: 1,
            usedDomains: 1,
            ...(user.referral && { referral: user.referral }),
          },
          description: `Plan for ${domainUrl}(${lastCustomCode ? [lastCustomCode, ...nonCustomCodes] : tokenUsed.length ? tokenUsed : orderedCodes})`,
        })

        console.log('[REWARDFUL] Subscription created:', subscription.id)

        cleanupPromises = [expireUsedPromo(numPromoSites, stripe, orderedCodes, user.id, user.current_organization_id, user.email)]
      } else if (promoCode && promoCode.length > 0) {
        return res.json({ valid: false, error: 'Invalid promo code' })
      } else if (cardTrial) {
        // Add Rewardful referral ID if present
        if (user.referral) {
          console.log('[REWARDFUL] Creating trial subscription with referral:', user.referral)
        } else {
          console.log('[REWARDFUL] No referral code found for user')
        }

        subscription = await stripe.subscriptions.create({
          trial_period_days: 30,
          customer: customer.id,
          items: [{ price: price.price_stripe_id, quantity: 1 }],
          expand: ['latest_invoice.payment_intent'],
          default_payment_method: customer.invoice_settings.default_payment_method,
          ...(user.referral && { coupon: REWARDFUL_COUPON }),
          metadata: {
            domainId,
            userId: user.id,
            maxDomains: 1,
            usedDomains: 1,
            ...(user.referral && { referral: user.referral }),
          },
          description: `Plan for ${domainUrl}`,
        })

        console.log('[REWARDFUL] Trial subscription created:', subscription.id)
      } else {
        // Add Rewardful referral ID if present
        if (user.referral) {
          console.log('[REWARDFUL] Creating subscription with referral:', user.referral)
        } else {
          console.log('[REWARDFUL] No referral code found for user')
        }

        subscription = await stripe.subscriptions.create({
          customer: customer.id,
          items: [{ price: price.price_stripe_id, quantity: 1 }],
          expand: ['latest_invoice.payment_intent'],
          default_payment_method: customer.invoice_settings.default_payment_method,
          ...(user.referral && { coupon: REWARDFUL_COUPON }),
          metadata: {
            domainId,
            userId: user.id,
            maxDomains: 1,
            usedDomains: 1,
            ...(user.referral && { referral: user.referral }),
          },
          description: `Plan for ${domainUrl}`,
        })

        console.log('[REWARDFUL] Subscription created:', subscription.id)
      }

      try {
        const previous_plan = await getSitePlanBySiteId(Number(domainId))
        cleanupPromises.push(deleteTrialPlan(previous_plan.id).then(() => {}))
      } catch {
        // Previous plan doesn't exist, continue
      }

      await Promise.all(cleanupPromises)

      if (promoCode && promoCode.length > 0) {
        await createSitesPlan(Number(user.id), String(subscription.id), planName, billingInterval, Number(domainId), 'appsumo')
      } else {
        await createSitesPlan(Number(user.id), String(subscription.id), planName, billingInterval, Number(domainId), '')
      }

      console.log('New Sub created')
      res.status(200).json({ success: true })
    } else if ('usedDomains' in subscription.metadata) {
      const UsedDomains = Number(subscription.metadata.usedDomains)

      if (UsedDomains >= Number(subscription.metadata.maxDomains)) {
        const metaData: any = subscription.metadata
        metaData.usedDomains = Number(UsedDomains + 1)
        metaData.updateMetaData = true

        const newQuant = subscription.items.data[0].quantity + 1

        await stripe.subscriptions.update(subscription.id, {
          metadata: metaData,
          items: [
            {
              id: subscription.items.data[0].id,
              quantity: newQuant,
            },
          ],
        })

        console.log('meta data updated')

        const cleanupPromisesSecond = []
        try {
          const previous_plan = await getSitePlanBySiteId(Number(domainId))
          cleanupPromisesSecond.push(deleteTrialPlan(previous_plan.id).then(() => {}))
        } catch {
          // Previous plan doesn't exist, continue
        }

        cleanupPromisesSecond.push(createSitesPlan(Number(user.id), String(subscription.id), planName, billingInterval, Number(domainId), ''))

        await Promise.all(cleanupPromisesSecond)
        res.status(200).json({ success: true })
      } else {
        const metaData: any = subscription.metadata
        metaData.usedDomains = Number(UsedDomains + 1)
        metaData.updateMetaData = true

        await stripe.subscriptions.update(subscription.id, {
          metadata: metaData,
        })

        console.log('meta data updated')

        const cleanupPromisesThird = []
        try {
          const previous_plan = await getSitePlanBySiteId(Number(domainId))
          cleanupPromisesThird.push(deleteTrialPlan(previous_plan.id).then(() => {}))
        } catch {
          // Previous plan doesn't exist, continue
        }

        cleanupPromisesThird.push(createSitesPlan(Number(user.id), String(subscription.id), planName, billingInterval, Number(domainId), ''))

        await Promise.all(cleanupPromisesThird)

        console.log('Old Sub created')
        res.status(200).json({ success: true })
      }
    } else {
      res.status(500).json({ error: 'Meta Data Not Configured' })
    }
  } catch (error) {
    console.log('erroring', error)
    res.status(500).json({ error: (error as Error).message })
  }
}
