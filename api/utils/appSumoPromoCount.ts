export function appSumoPromoCount(subscriptions: any, promoCode: any): any {
  let promoCount = 0;
  let singlePromoCount = 0;
  let doublePromoCount = 0;
  let triplePromoCount = 0;
  let codes:[] = [];
  if (subscriptions.data.length > 0) {
    subscriptions.data.forEach((subscription: any) => {
      const match = subscription.description.match(/\(([^)]+)\)/);
      if (match) {
        // Split the extracted string on commas and trim any extra whitespace.
        const codesInDesc = match[1].split(',').map((code: string) => code.trim());
        // Check if any of the codes in the description match one of your promo codes.
        if((typeof(promoCode[0]) == 'number') && (promoCode.length == codesInDesc.length)){
          console.log(`Subscription ${subscription.id} contains all promo codes.`);
          promoCount++;
          codes = codesInDesc;
        }
        else{
          const allPromoCodesPresent = promoCode.every((code: string) => codesInDesc.includes(code));
          if (allPromoCodesPresent) {
            console.log(`Subscription ${subscription.id} contains all promo codes.`);
            promoCount++;
          }
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

  if (promoCode.length == 1) {
    if(triplePromoCount == 2){
      throw Error(`You have used all enterprise promocodes'`);
    }
    else if(doublePromoCount == 2){
      throw Error(`You have used all medium promocodes, you must stack now'`);
    }
    else if(singlePromoCount == 2){
      throw Error(`You have used all starter promocodes, you must stack now'`);
    }

  } else if (promoCode.length == 2) {
    if(triplePromoCount == 2){
      throw Error(`You have used all enterprise promocodes'`);
    }
    else if(doublePromoCount == 2){
      throw Error(`You have used all medium promocodes, you must stack now'`);
    }
  } else if (promoCode.length == 3) {
    if(triplePromoCount == 2){
      throw Error(`You have used all enterprise promocodes'`);
    }
  }

  return { promoCount,codes };
}
