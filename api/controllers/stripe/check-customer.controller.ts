import { Request, Response } from 'express'
import Stripe from 'stripe'

import { getUserTokens } from '../../repository/user_plan_tokens.repository'
import { customTokenCount } from '../../utils/customTokenCount'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY)

export async function checkCustomer(req: Request, res: Response) {
  const { user } = req as any

  try {
    // Search for an existing customer by email
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    })

    let customer

    const userAppSumoTokens = await getUserTokens(user.id)
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

        let price_id
        let price: Stripe.Price

        if (subscriptions.data.length > 0) {
          price_id = (subscriptions.data[0] as Stripe.Subscription).items.data[0].price
          price = await stripe.prices.retrieve(price_id.id, {
            expand: ['tiers'],
          })
        }

        // Handle trial subscriptions
        if (trial_subs?.data?.length) {
          const prod = await stripe.products.retrieve(String(trial_subs?.data[0]?.plan?.product))
          const trialEndTimestamp = trial_subs?.data[0]?.trial_end
          const currentTimestamp = Math.floor(Date.now() / 1000)
          const daysRemaining = Math.ceil((trialEndTimestamp! - currentTimestamp) / (60 * 60 * 24))

          // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
          if (!price || price?.tiers?.length! > 0) {
            return res.status(200).json({
              tierPlan: true,
              isCustomer: true,
              plan_name: prod.name,
              interval: trial_subs.data[0].plan.interval,
              submeta: trial_subs.data[0].metadata,
              card: customers?.data[0]?.invoice_settings.default_payment_method,
              expiry: daysRemaining,
            })
          }
          const subscriptionData = processSubscriptions(trial_subs.data, subscriptions.data)
          const appSumoData = calculateAppSumoData(subscriptions.data)

          return res.status(200).json({
            trial_subs: JSON.stringify(subscriptionData.trial_sub_data),
            subscriptions: JSON.stringify(subscriptionData.regular_sub_data),
            isCustomer: true,
            plan_name: prod.name,
            interval: trial_subs.data[0].plan.interval,
            submeta: trial_subs.data[0].metadata,
            card: customers?.data[0]?.invoice_settings.default_payment_method,
            expiry: daysRemaining,
            appSumoCount: appSumoData.appSumoCount,
            codeCount: maxSites > 0 ? maxSites : userAppSumoTokens.length ? userAppSumoTokens.length : appSumoData.uniquePromoCodes.size,
            infinityToken: hasCustomInfinityToken,
          })
        }
        if (subscriptions.data.length > 0) {
          const prod = await stripe.products.retrieve(String(subscriptions.data[0]?.plan?.product))

          // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
          if (!price || price?.tiers?.length! > 0) {
            return res.status(200).json({
              tierPlan: true,
              isCustomer: true,
              plan_name: prod.name,
              interval: subscriptions.data[0].plan.interval,
              submeta: subscriptions.data[0].metadata,
              card: customers?.data[0]?.invoice_settings.default_payment_method,
            })
          }
          const subscriptionData = processSubscriptions([], subscriptions.data)
          const appSumoData = calculateAppSumoData(subscriptions.data)

          return res.status(200).json({
            subscriptions: JSON.stringify(subscriptionData.regular_sub_data),
            isCustomer: true,
            plan_name: prod.name,
            interval: subscriptions.data[0].plan.interval,
            submeta: subscriptions.data[0].metadata,
            card: customers?.data[0]?.invoice_settings.default_payment_method,
            appSumoCount: appSumoData.appSumoCount,
            codeCount: maxSites > 0 ? maxSites : userAppSumoTokens.length ? userAppSumoTokens.length : appSumoData.uniquePromoCodes.size,
            infinityToken: hasCustomInfinityToken,
          })
        }
        return res.status(200).json({
          isCustomer: true,
          plan_name: '',
          interval: '',
          card: customers?.data[0]?.invoice_settings.default_payment_method,
          codeCount: maxSites > 0 ? maxSites : userAppSumoTokens.length,
          infinityToken: hasCustomInfinityToken,
        })
      } catch {
        return res.status(200).json({
          isCustomer: true,
          plan_name: '',
          interval: '',
          card: customers?.data[0]?.invoice_settings.default_payment_method,
          codeCount: maxSites > 0 ? maxSites : userAppSumoTokens.length,
          infinityToken: hasCustomInfinityToken,
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
