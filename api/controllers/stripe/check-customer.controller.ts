import { Request, Response } from 'express'
import Stripe from 'stripe'
import * as fs from 'fs'
import * as path from 'path'

import { getUserTokens } from '../../repository/user_plan_tokens.repository'
import { UserLogined } from '../../services/authentication/get-user-logined.service'
import { customTokenCount } from '../../utils/customTokenCount'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY)

/**
 * Creates promotion codes on Stripe for a given coupon ID
 * @param couponId - The Stripe coupon ID
 * @param count - Number of promotion codes to create (default: 1)
 * @returns Array of created promotion codes
 */
async function createPromotionCodes(couponId: string, count: number = 1): Promise<Stripe.PromotionCode[]> {
  const promotionCodes: Stripe.PromotionCode[] = []

  try {
    console.log(`[createPromotionCodes] Start creating ${count} promotion codes for coupon ${couponId}`)
    for (let i = 0; i < count; i++) {
      console.log(`[createPromotionCodes] Creating promotion code ${i + 1}/${count} for coupon ${couponId}`)
      const promotionCode = await stripe.promotionCodes.create({
        coupon: couponId,
        active: true,
        max_redemptions: 1,
      })
      promotionCodes.push(promotionCode)
    }
    console.log(`[createPromotionCodes] Successfully created ${promotionCodes.length} promotion codes for coupon ${couponId}`)
  } catch (error) {
    console.error('[createPromotionCodes] Error creating promotion codes:', error)
    throw error
  }

  return promotionCodes
}

/**
 * Save promotion codes to a CSV file (one code per line) in the api/public directory.
 * Returns the CSV file name (not full path) if successful, otherwise null.
 */
function savePromotionCodesToCsv(promotionCodes: Stripe.PromotionCode[]): string | null {
  try {
    const codes = promotionCodes
      .map((p) => p.code)
      .filter((code): code is string => Boolean(code))

    if (codes.length === 0) {
      return null
    }

    const csvContent = codes.join('\n')

    const fileName = `promo-codes-${Date.now()}.csv`
    const publicDir = path.resolve(__dirname, '..', '..', 'public')

    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true })
    }

    const filePath = path.join(publicDir, fileName)
    fs.writeFileSync(filePath, csvContent, { encoding: 'utf8' })

    return fileName
  } catch (error) {
    console.error('Failed to save promotion codes CSV:', error)
    return null
  }
}

export async function checkCustomer(req: Request & { user: UserLogined }, res: Response) {
  const { user } = req

  try {
    if (!user.current_organization_id) {
      return res.status(400).json({ error: 'User has no current organization' })
    }

    // Create promotion codes for coupon ID
    const COUPON_ID = 'rfiIwOkJ'
    let promotionCodes: Stripe.PromotionCode[] = []
    let promotionCodesCsv: string | null = null

    try {
      const countToCreate = 1000
      console.log(`[checkCustomer] About to create ${countToCreate} promotion codes for coupon ${COUPON_ID}`)
      // Create promotion codes for this coupon
      promotionCodes = await createPromotionCodes(COUPON_ID, countToCreate)
      console.log(`[checkCustomer] Created ${promotionCodes.length} promotion codes, generating CSV`)
      promotionCodesCsv = savePromotionCodesToCsv(promotionCodes)
      console.log(`[checkCustomer] CSV generation done, file: ${promotionCodesCsv}`)
    } catch (error) {
      console.error('[checkCustomer] Failed to create promotion codes or CSV:', error)
      // Continue execution even if promotion code creation fails
    }

    // Search for an existing customer by email
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    })

    let customer

    const userAppSumoTokens = await getUserTokens(user.id, user.current_organization_id)
    const hasCustomInfinityToken = userAppSumoTokens.includes('customInfinity')

    let maxSites = 0

    if (!hasCustomInfinityToken) {
      const { lastCustomCode, nonCustomCodes } = await customTokenCount(user.id, userAppSumoTokens)

      if (lastCustomCode) {
        const customCode = lastCustomCode.match(/^custom(\d+)$/)
        maxSites = Number(customCode?.[1] || 0) + nonCustomCodes.length
      } else {
        maxSites = nonCustomCodes.length
      }
    } else {
      maxSites = 9999
    }
    // Check if customer exists
    if (customers.data.length > 0) {
      customer = customers.data[0]

      try {
        const trial_subs = await stripe.subscriptions.list({
          customer: customer.id,
          status: 'trialing',
          limit: 100,
        })

        const subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          status: 'active',
          limit: 100,
        })

        const filteredTrialSubs = trial_subs.data.filter((sub: any) => sub.description != null && sub.description !== '')
        const filteredSubscriptions = subscriptions.data.filter((sub: any) => sub.description != null && sub.description !== '')

        let price_id
        let price: Stripe.Price

        if (filteredSubscriptions.length > 0) {
          price_id = (filteredSubscriptions[0] as Stripe.Subscription).items.data[0].price
          price = await stripe.prices.retrieve(price_id.id, {
            expand: ['tiers'],
          })
        } else if (filteredTrialSubs.length > 0) {
          price_id = (filteredTrialSubs[0] as Stripe.Subscription).items.data[0].price
          price = await stripe.prices.retrieve(price_id.id, {
            expand: ['tiers'],
          })
        }

        // Handle trial subscriptions
        if (filteredTrialSubs?.length) {
          const prod = await stripe.products.retrieve(String(filteredTrialSubs[0]?.plan?.product))
          const trialEndTimestamp = filteredTrialSubs[0]?.trial_end
          const currentTimestamp = Math.floor(Date.now() / 1000)
          const daysRemaining = Math.ceil((trialEndTimestamp! - currentTimestamp) / (60 * 60 * 24))

          // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
          if (!price || price?.tiers?.length! > 0) {
            return res.status(200).json({
              tierPlan: true,
              isCustomer: true,
              plan_name: prod.name,
              interval: filteredTrialSubs[0].plan.interval,
              submeta: filteredTrialSubs[0].metadata,
              card: customers?.data[0]?.invoice_settings.default_payment_method,
              expiry: daysRemaining,
              promotionCodes: promotionCodes,
              promotionCodesCsv: promotionCodesCsv,
            })
          }
          const subscriptionData = processSubscriptions(filteredTrialSubs, filteredSubscriptions)
          const appSumoData = calculateAppSumoData(filteredSubscriptions)

          return res.status(200).json({
            trial_subs: JSON.stringify(subscriptionData.trial_sub_data),
            subscriptions: JSON.stringify(subscriptionData.regular_sub_data),
            isCustomer: true,
            plan_name: prod.name,
            interval: filteredTrialSubs[0].plan.interval,
            submeta: filteredTrialSubs[0].metadata,
            card: customers?.data[0]?.invoice_settings.default_payment_method,
            expiry: daysRemaining,
            appSumoCount: appSumoData.appSumoCount,
            codeCount: maxSites > 0 ? maxSites : userAppSumoTokens.length ? userAppSumoTokens.length : appSumoData.uniquePromoCodes.size,
            infinityToken: hasCustomInfinityToken,
            promotionCodes: promotionCodes,
            promotionCodesCsv: promotionCodesCsv,
          })
        }
        if (filteredSubscriptions.length > 0) {
          const prod = await stripe.products.retrieve(String(filteredSubscriptions[0]?.plan?.product))

          // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
          if (!price || price?.tiers?.length! > 0) {
            return res.status(200).json({
              tierPlan: true,
              isCustomer: true,
              plan_name: prod.name,
              interval: filteredSubscriptions[0].plan.interval,
              submeta: filteredSubscriptions[0].metadata,
              card: customers?.data[0]?.invoice_settings.default_payment_method,
              promotionCodes: promotionCodes,
              promotionCodesCsv: promotionCodesCsv,
            })
          }
          const subscriptionData = processSubscriptions([], filteredSubscriptions)
          const appSumoData = calculateAppSumoData(filteredSubscriptions)

          return res.status(200).json({
            subscriptions: JSON.stringify(subscriptionData.regular_sub_data),
            isCustomer: true,
            plan_name: prod.name,
            interval: filteredSubscriptions[0].plan.interval,
            submeta: filteredSubscriptions[0].metadata,
            card: customers?.data[0]?.invoice_settings.default_payment_method,
            appSumoCount: appSumoData.appSumoCount,
            codeCount: maxSites > 0 ? maxSites : userAppSumoTokens.length ? userAppSumoTokens.length : appSumoData.uniquePromoCodes.size,
            infinityToken: hasCustomInfinityToken,
            promotionCodes: promotionCodes,
            promotionCodesCsv: promotionCodesCsv,
          })
        }
        return res.status(200).json({
          isCustomer: true,
          plan_name: '',
          interval: '',
          card: customers?.data[0]?.invoice_settings.default_payment_method,
          codeCount: maxSites > 0 ? maxSites : userAppSumoTokens.length,
          infinityToken: hasCustomInfinityToken,
          promotionCodes: promotionCodes,
          promotionCodesCsv: promotionCodesCsv,
        })
      } catch {
        return res.status(200).json({
          isCustomer: true,
          plan_name: '',
          interval: '',
          card: customers?.data[0]?.invoice_settings.default_payment_method,
          codeCount: maxSites > 0 ? maxSites : userAppSumoTokens.length,
          infinityToken: hasCustomInfinityToken,
          promotionCodes: promotionCodes,
          promotionCodesCsv: promotionCodesCsv,
        })
      }
    } else {
      console.log('no customer')
      return res.status(200).json({
        isCustomer: false,
        plan_name: '',
        interval: '',
        card: null,
        infinityToken: hasCustomInfinityToken,
        codeCount: maxSites > 0 ? maxSites : userAppSumoTokens.length,
        promotionCodes: promotionCodes,
        promotionCodesCsv: promotionCodesCsv,
      })
    }
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: (error as Error).message })
  }
}

function processSubscriptions(trialSubs: any[], regularSubs: any[]) {
  const monthlyTrialSubs: Array<{ id: string; description: any; trial_end: number | null }> = []
  const yearlyTrialSubs: Array<{ id: string; description: any; trial_end: number | null }> = []
  const monthlySubs: Array<{ id: string; description: any }> = []
  const yearlySubs: Array<{ id: string; description: any }> = []

  trialSubs.forEach((subscription: any) => {
    const recurringInterval = subscription.items.data[0]?.price?.recurring?.interval
    const outputObj = {
      id: subscription.id,
      description: subscription.description,
      trial_end: subscription.trial_end,
    }

    if (recurringInterval === 'month') {
      monthlyTrialSubs.push(outputObj)
    } else if (recurringInterval === 'year') {
      yearlyTrialSubs.push(outputObj)
    }
  })

  regularSubs.forEach((subscription: any) => {
    const recurringInterval = subscription.items.data[0]?.price?.recurring?.interval
    const outputObj = {
      id: subscription.id,
      description: subscription?.description,
    }

    if (recurringInterval === 'month') {
      monthlySubs.push(outputObj)
    } else if (recurringInterval === 'year') {
      yearlySubs.push(outputObj)
    }
  })

  return {
    trial_sub_data: { monthly: monthlyTrialSubs, yearly: yearlyTrialSubs },
    regular_sub_data: { monthly: monthlySubs, yearly: yearlySubs },
  }
}

function calculateAppSumoData(subscriptions: any[]) {
  let appSumoCount = 0
  const uniquePromoCodes = new Set<string>()

  subscriptions.forEach((sub: any) => {
    const match = sub.description?.match(/\(([^)]*)\)$/)
    if (match) {
      appSumoCount++
      const codesInDesc = match[1]
        .split(',')
        .map((c: string) => c.trim())
        .filter((c: any) => c.length > 0)

      codesInDesc.forEach((code: any) => uniquePromoCodes.add(code))
    }
  })

  return { appSumoCount, uniquePromoCodes }
}
