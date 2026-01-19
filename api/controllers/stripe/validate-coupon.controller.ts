import { Request, Response } from 'express'

import { APP_SUMO_COUPON_IDS } from '../../constants/billing.constant'
import { UserLogined } from '../../services/authentication/get-user-logined.service'
import findPromo from '../../services/stripe/findPromo'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY)

export async function validateCoupon(req: Request & { user: UserLogined }, res: Response) {
  const { couponCode } = req.body

  try {
    const promoCodeData = await findPromo(stripe, couponCode.trim())

    if (!promoCodeData) {
      return res.json({ valid: false, error: 'Invalid promo code' })
    }

    if (!promoCodeData.active) {
      return res.json({ valid: false, error: 'Promo Expired' })
    }

    // Check if this is an AppSumo coupon
    const isAppSumoCoupon = APP_SUMO_COUPON_IDS.includes(promoCodeData.coupon.id)

    if (isAppSumoCoupon) {
      // Return valid with appSumo flag
      if (promoCodeData.coupon.percent_off) {
        return res.json({ valid: true, discount: Number(promoCodeData.coupon.percent_off) / 100, id: promoCodeData.coupon.id, percent: true, appSumo: true })
      }
      return res.json({ valid: true, discount: Number(promoCodeData.coupon.amount_off) / 100, id: promoCodeData.coupon.id, percent: false, appSumo: true })
    }

    // Handle regular promo coupons (including retention coupon)
    if (promoCodeData.coupon.percent_off) {
      return res.json({ valid: true, discount: Number(promoCodeData.coupon.percent_off) / 100, id: promoCodeData.coupon.id, percent: true, appSumo: false })
    }
    
    return res.json({ valid: true, discount: Number(promoCodeData.coupon.amount_off) / 100, id: promoCodeData.coupon.id, percent: false, appSumo: false })
  } catch (error) {
    console.log('err', error)
    res.status(500).json({ error: error.message })
  }
}
