import Stripe from 'stripe'

export default async function findAllPromos(stripe: Stripe, couponCode: string): Promise<Stripe.PromotionCode | null> {
  let startingAfter: string | null = null
  let promoCodeData: Stripe.PromotionCode | null = null

  while (true) {
    // Build parameters with pagination.
    const params: any = { limit: 100 }
    if (startingAfter) {
      params.starting_after = startingAfter
    }

    // List promo codes from Stripe.
    const promoCodes = await stripe.promotionCodes.list(params)

    // Look for a promo code that matches the provided coupon code.
    for (const promo of promoCodes.data) {
      if (promo.code === couponCode) {
        promoCodeData = promo
        break
      }
    }

    if (promoCodeData) {
      break
    }

    // Exit the loop if there are no more pages.
    if (!promoCodes.has_more) {
      break
    }

    // Set startingAfter to the last promo's id for the next page.
    startingAfter = promoCodes.data[promoCodes.data.length - 1].id
  }

  return promoCodeData
}
