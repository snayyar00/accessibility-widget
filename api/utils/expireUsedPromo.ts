import Stripe from 'stripe';
import findAllPromos from '~/services/stripe/findAllPromos';

export async function expireUsedPromo(
  numPromoSites:number,
  stripe: Stripe,
  orderedCodes: string[]
): Promise<void> {
  // 1) account for the new site
  const effectiveSites      = numPromoSites + 1;

  const desiredExpiredCount = Math.floor(effectiveSites / 2);
  if (desiredExpiredCount < 1) return;

  // 2) load *all* codes (active + inactive) in order
  const allPromos: Stripe.PromotionCode[] = [];
  for (const code of orderedCodes) {
    // you’ll need a helper that fetches regardless of active status
    const promo = await findAllPromos(stripe, code);
    if (promo) allPromos.push(promo);
  }

  // 3) count how many are already inactive
  const alreadyExpiredCount = allPromos.filter(p => !p.active).length;

  // 4) how many *new* ones we should deactivate
  const toExpireCount = desiredExpiredCount - alreadyExpiredCount;

  if (toExpireCount <= 0) return; 

  // 5) pick the first `toExpireCount` still‑active promos
  const activePromos = allPromos.filter(p => p.active);
  const toExpire     = activePromos.slice(0, toExpireCount);

  // 6) expire them
  await Promise.all(
    toExpire.map(p => stripe.promotionCodes.update(p.id, { active: false }))
  );
}
