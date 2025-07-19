import { Request, Response } from 'express'

import { RETENTION_COUPON_ID } from '../../constants/billing.constant'
import { findSiteById } from '../../repository/sites_allowed.repository'
import { getSitePlanBySiteId } from '../../repository/sites_plans.repository'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY)

export async function applyRetentionDiscount(req: Request, res: Response) {
  const { domainId, status } = req.body

  const { user } = req as any
  const site = await findSiteById(domainId)

  if (!site || site.user_id !== user.id) {
    return res.status(403).json({ error: 'User does not own this domain' })
  }

  try {
    const sitePlan = await getSitePlanBySiteId(Number(domainId))

    if (!sitePlan && status != 'Trial' && status != 'Trial Expired') {
      return res.status(404).json({ error: 'Site plan not found' })
    }

    if (sitePlan?.subscription_id == 'Trial' || status == 'Trial' || status == 'Trial Expired') {
      let customerId = sitePlan?.customerId

      if (status == 'Trial' || status == 'Trial Expired') {
        const customers = await stripe.customers.list({
          email: user.email,
          limit: 1,
        })

        if (customers.data.length > 0) {
          customerId = customers.data[0].id
        } else {
          return res.status(400).json({ error: 'Customer not found' })
        }
      }

      const promoCode = await stripe.promotionCodes.create({
        coupon: RETENTION_COUPON_ID,
        max_redemptions: 1,
        active: true,
        customer: customerId,
      })

      return res.status(200).json({
        couponCode: promoCode.code,
        message: 'Coupon code created successfully',
      })
    }
    // Apply existing coupon to active subscription
    try {
      const subscription = await stripe.subscriptions.retrieve(sitePlan.subcriptionId)

      if (!subscription || subscription.status !== 'active') {
        return res.status(400).json({ error: 'Active subscription not found' })
      }

      await stripe.subscriptions.update(subscription.id, {
        coupon: RETENTION_COUPON_ID,
      })

      return res.status(200).json({
        message: '5% discount applied to subscription successfully',
      })
    } catch (subscriptionError) {
      console.error('Error applying discount to subscription:', subscriptionError)
      return res.status(500).json({ error: 'Failed to apply discount to subscription' })
    }
  } catch (error) {
    console.error('Error applying retention discount:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
