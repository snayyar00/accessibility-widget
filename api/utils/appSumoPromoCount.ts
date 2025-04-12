export function appSumoPromoCount(subscriptions: any, promoCode: any): any {
  let promoCount = 0;
  let singlePromoCount = 0;
  let doublePromoCount = 0;
  let triplePromoCount = 0;

  if (subscriptions.data.length > 0) {
    subscriptions.data.forEach((subscription: any) => {
      const match = subscription.description.match(/\(([^)]+)\)/);
      if (match) {
        // Split the extracted string on commas and trim any extra whitespace.
        const codesInDesc = match[1].split(',').map((code: string) => code.trim());
        // Check if any of the codes in the description match one of your promo codes.
        const allPromoCodesPresent = promoCode.every((code: string) => codesInDesc.includes(code));
        if (allPromoCodesPresent) {
          console.log(`Subscription ${subscription.id} contains all promo codes.`);
          promoCount++;
        }
        if (codesInDesc.length === 1) {
          singlePromoCount++;
        } else if (codesInDesc.length === 2) {
          doublePromoCount++;
        } else if (codesInDesc.length === 3) {
          triplePromoCount++;
        }
      }
    });
  }

  if (singlePromoCount == 2 && promoCode.length == 1) {
    throw Error('You have used all Starter PromoCodes');
  } else if (doublePromoCount == 4 && promoCode.length == 2) {
    throw Error('You have used all Medium PromoCodes');
  } else if (triplePromoCount == 6 && promoCode.length == 3) {
    throw Error('You have used all Enterprise PromoCodes');
  }

  return { promoCount };
}
