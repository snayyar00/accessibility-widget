import { findUsersByToken, getUserTokens } from '../repository/user_plan_tokens.repository';

export async function appSumoPromoCount(subscriptions: any, promoCode: any, userId: number): Promise<any> {
  let promoSiteCount = 0;

  const seenCodes = new Set<string>();
  const orderedCodes: string[] = [];

  await Promise.all(
    promoCode.map(async (c: any) => {
      const users = await findUsersByToken(c);

      // Filter out the current user
      const otherUsers = users.filter((userID: number) => userID !== userId);

      if (otherUsers.length > 0) {
        console.log('otherUsers', otherUsers);
        throw new Error(`The promo code ${c} is already redeemed`);
      }
    }),
  );

  if (subscriptions.data.length > 0) {
    const sortedSubs = [...subscriptions.data].sort((a, b) => a.created - b.created);

    sortedSubs.forEach((subscription: any) => {
      const match = subscription.description.match(/\(([^)]*)\)$/);
      if (match) {
        // Split the extracted string on commas and trim any extra whitespace.
        const codesInDesc = match[1].split(',').map((code: string) => code.trim());
        codesInDesc.forEach((c: any) => {
          if (/^\d+$/.test(c)) {
          } else if (!seenCodes.has(c)) {
            seenCodes.add(c);
            orderedCodes.push(c);
          }
        });

        promoSiteCount++;
      }
    });
  }

  const numPromoSites = promoSiteCount;

  const alreadyUsed = promoCode.filter((code: any) => orderedCodes.includes(code));

  if (alreadyUsed.length > 0) {
    const plural = alreadyUsed.length > 1 ? 's' : '';
    throw new Error(`You have already used the following promo code${plural}: ${alreadyUsed.join(', ')}`);
  }

  // Push the new codes aswell, which will be used incase sub succeeds
  promoCode.forEach((c: any) => {
    if (/^\d+$/.test(c)) {
    } else if (!seenCodes.has(c)) {
      seenCodes.add(c);
      orderedCodes.push(c);
    }
  });

  const usedTokens = await getUserTokens(userId);
  let max_sites = orderedCodes.length * 2;
  if (usedTokens.length > 0) {
    let maxNum: number = usedTokens.reduce((max, code) => {
      const m = code.match(/^custom(\d+)$/);
      return m ? Math.max(max, Number(m[1])) : max;
    }, 0);

    const hasInfinityToken = usedTokens.includes('customInfinity');

    if (hasInfinityToken) {
      // Infinity token
      max_sites = Infinity;
    } else if (maxNum > 0) {
      maxNum += promoCode.length; // Add the new promo codes to custom tokens
      max_sites = Math.max(max_sites, maxNum * 2);
    } else {
      // No custom token
      max_sites = (usedTokens.length + promoCode.length) * 2;
    }
  }

  if (numPromoSites == max_sites) {
    throw new Error('You have reached max limit of sites for your app sumo plan');
  }

  return { orderedCodes, numPromoSites };
}
