import Stripe from 'stripe';
import findPromo from '~/services/stripe/findPromo';

export async function expireUsedPromo(promoCount: any,codes:[], promoCodeData: any, promoCode: any, stripe: any): Promise<any> {
    // PromoCount must be less than limit always

    let promos = []
    if (codes && codes.length > 0) {
      const validCodesData: Stripe.PromotionCode[] = [];
      const invalidCodes: string[] = [];
      console.log("finding = ",codes);
      // Process each code sequentially (you can also use Promise.all if you prefer parallel execution)
      for (const code of codes) {
        const found = await findPromo(stripe, code);
        if (found) {
          validCodesData.push(found);
        } else {
          invalidCodes.push(code);
        }
      }
      console.log(invalidCodes);
    
      if (invalidCodes.length > 0) {
        throw Error("No PromoCodes match")
      }
    
      // Now, validCodesData contains all valid promo code objects.
      promos = validCodesData;
    }
    else{
      promos = promoCodeData;
    }
    
    if ([1,2,3].includes(promoCode.length) && promoCount == 1) {
    // First promo 2 sites have been added
    try {
      const updatePromises = promos.map((promo: Stripe.PromotionCode) => stripe.promotionCodes.update(promo.id, { active: false }));
      const updatedCoupons = await Promise.all(updatePromises);
      updatedCoupons.forEach((coupon) => {
        console.log(`Coupon Expired: ${coupon.id}`);
      });
    } catch (error) {
      console.error('Error expiring promo codes:', error);
    }
  }
}
