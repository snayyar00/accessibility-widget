export function appSumoPromoCount(subscriptions: any, promoCode: any): any {
  let promoSiteCount = 0;

  const seenCodes = new Set<string>();
  const orderedCodes: string[] = [];

  

  if (subscriptions.data.length > 0) {
    const sortedSubs = [...subscriptions.data].sort(
      (a, b) => a.created - b.created
    );

    sortedSubs.forEach((subscription: any) => {
      const match = subscription.description.match(/\(([^)]*)\)$/);
      if (match) {
        // Split the extracted string on commas and trim any extra whitespace.
        const codesInDesc = match[1].split(',').map((code: string) => code.trim());
        codesInDesc.forEach((c:any) => {
          if(String(c).length == 1){
          }
          else if (!seenCodes.has(c)) {
            seenCodes.add(c);
            orderedCodes.push(c);
          }
        });

        promoSiteCount++;
      }
    });
  }

  const numPromoSites  = promoSiteCount;

  const alreadyUsed = promoCode.filter((code:any) => orderedCodes.includes(code));

  if (alreadyUsed.length > 0) {
    const plural = alreadyUsed.length > 1 ? 's' : '';
    throw new Error(
      `You have already used the following promo code${plural}: ${alreadyUsed.join(', ')}`
    );
  }

  // Push the new codes aswell, which will be used incase sub succeeds
  promoCode.forEach((c:any)=>{
    if(String(c).length == 1){
    }
    else if (!seenCodes.has(c)) {
      seenCodes.add(c);
      orderedCodes.push(c);
    }
  })

  let max_sites = (orderedCodes.length * 2);

  if(numPromoSites == max_sites){
    throw new Error(
      `You have reached max limit of sites for your app sumo plan`
    );
  }

  return { orderedCodes,numPromoSites };
}
