import { Request, Response } from 'express';
import { APP_SUMO_COUPON_IDS } from '../../constants/billing.constant';
import findPromo from '../../services/stripe/findPromo';

const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY);

export async function validateCoupon(req: Request, res: Response) {
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
}
