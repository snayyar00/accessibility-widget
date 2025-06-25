import Stripe from 'stripe';
import { addUserToken } from '~/repository/user_plan_tokens.repository';
import findAllPromos from '~/services/stripe/findAllPromos';

export async function expireUsedPromo(
  numPromoSites:number,
  stripe: Stripe,
  orderedCodes: string[],
  userId:number,
  email:string,
): Promise<void> {
  // Save the promocodes to the user first (blocking)
  await addUserToken(userId, orderedCodes, email);

  // Run the rest of the expiration logic in background
  setImmediate(async () => {
    try {
      // 1) account for the new site
      const effectiveSites = numPromoSites + 1;
      const desiredExpiredCount = Math.floor(effectiveSites / 2);
      
      if (desiredExpiredCount < 1) return;

      // 2) load *all* codes (active + inactive) in parallel
      const allPromos = await Promise.all(
        orderedCodes.map(async (code) => {
          const promo = await findAllPromos(stripe, code);
          return promo;
        })
      ).then(promos => promos.filter(Boolean) as Stripe.PromotionCode[]);

      // 3) count how many are already inactive
      const alreadyExpiredCount = allPromos.filter(p => !p.active).length;

      // 4) how many *new* ones we should deactivate
      const toExpireCount = desiredExpiredCount - alreadyExpiredCount;

      if (toExpireCount <= 0) return; 

      // 5) pick the first `toExpireCount` still‑active promos
      const activePromos = allPromos.filter(p => p.active);
      const toExpire = activePromos.slice(0, toExpireCount);

      // 6) expire them
      await Promise.all(
        toExpire.map(p => stripe.promotionCodes.update(p.id, { active: false }))
      );
    } catch (error) {
      console.error('Background promo code expiration failed:', error);
    }
  });
}
