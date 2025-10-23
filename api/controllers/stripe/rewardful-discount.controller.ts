import { Request, Response } from 'express'

import { REWARDFUL_COUPON } from '../../constants/billing.constant'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY)

export async function getRewardfulDiscount(req: Request, res: Response) {
  try {
    // Retrieve the Rewardful coupon from Stripe
    const coupon = await stripe.coupons.retrieve(REWARDFUL_COUPON)

    if (!coupon || !coupon.valid) {
      return res.json({
        valid: false,
        discount: 0,
        percentOff: null,
        amountOff: null,
      })
    }

    // Return discount information
    const discountInfo = {
      valid: true,
      percentOff: coupon.percent_off || null,
      amountOff: coupon.amount_off ? coupon.amount_off / 100 : null, // Convert cents to dollars
      currency: coupon.currency || 'usd',
      duration: coupon.duration,
      durationInMonths: coupon.duration_in_months || null,
      name: coupon.name || 'Referral Discount',
    }

    return res.json(discountInfo)
  } catch (error) {
    console.error('Error fetching Rewardful coupon:', error)
    res.status(500).json({
      error: 'Failed to fetch discount information',
      valid: false,
      discount: 0,
    })
  }
}
