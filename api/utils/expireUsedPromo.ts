import Stripe from 'stripe';

export async function expireUsedPromo(promoCount: any, promoCodeData: any, promoCode: any, stripe: any): Promise<any> {
    // PromoCount must be less than limit always
    
    if (promoCode.length == 1 && promoCount == 1) {
    // First promo 2 sites have been added
    try {
      const updatePromises = promoCodeData.map((promo: Stripe.PromotionCode) => stripe.promotionCodes.update(promo.id, { active: false }));
      const updatedCoupons = await Promise.all(updatePromises);
      updatedCoupons.forEach((coupon) => {
        console.log(`Coupon Expired: ${coupon.id}`);
      });
    } catch (error) {
      console.error('Error expiring promo codes:', error);
    }
  }

  if (promoCode.length == 2 && promoCount == 3) {
    // Second promo 4 sites have been added
    try {
      const updatePromises = promoCodeData.map((promo: Stripe.PromotionCode) => stripe.promotionCodes.update(promo.id, { active: false }));
      const updatedCoupons = await Promise.all(updatePromises);
      updatedCoupons.forEach((coupon) => {
        console.log(`Coupon Expired: ${coupon.id}`);
      });
    } catch (error) {
      console.error('Error expiring promo codes:', error);
    }
  }

  if (promoCode.length == 3 && promoCount == 5) {
    // Third promo 6 sites have been added
    try {
      const updatePromises = promoCodeData.map((promo: Stripe.PromotionCode) => stripe.promotionCodes.update(promo.id, { active: false }));
      const updatedCoupons = await Promise.all(updatePromises);
      updatedCoupons.forEach((coupon) => {
        console.log(`Coupon Expired: ${coupon.id}`);
      });
    } catch (error) {
      console.error('Error expiring promo codes:', error);
    }
  }
}
