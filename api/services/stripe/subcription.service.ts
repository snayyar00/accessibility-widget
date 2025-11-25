import dayjs from 'dayjs'
import Stripe from 'stripe'

import { normalizeEmail } from '../../helpers/string.helper'
import { getSitesPlanByCustomerIdAndSubscriptionId } from '../../repository/sites_plans.repository'
import { ApolloError } from '../../utils/graphql-errors.helper'
import logger from '../../utils/logger'

export type DataSubcription = {
  customer: string
  items?: {
    price: string
  }[]
  trial_end?: number
  hosted_invoice_url?: string
  coupon?: string
  trial_settings?: any
  metadata?: {
    [key: string]: string
  }
}

type NewSubcription = {
  customer_id: string
  subcription_id: string
}

const stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY, {
  apiVersion: '2020-08-27',
})

/**
 * Create new subcription
 *
 * @param {string} token
 * @param {string} email
 * @param {string} name
 * @param {string} priceId
 * @param {boolean} isTrial
 * @param {string} couponCode
 * @param {string} referralCode
 * @param {string} agencyAccountId - Optional Stripe account ID for revenue sharing
 * @param {number} revenueSharePercent - Platform's revenue share percentage (0-100), defaults to 50
 * @returns {Promise<any>}
 */
export async function createNewSubcription(token: string, email: string, name: string, priceId: string, isTrial = false, couponCode = '', referralCode = '', agencyAccountId: string | null = null, revenueSharePercent = 50): Promise<NewSubcription> {
  if (!token) {
    throw new ApolloError('Invalid token')
  }

  try {
    const existing_sub = await stripe.subscriptions.retrieve(token)

    if (existing_sub) {
      return {
        customer_id: String(existing_sub.customer),
        subcription_id: existing_sub.id,
      }
    }
  } catch {}

  try {
    const customers = await stripe.customers.list({
      email,
      limit: 1,
    })

    let customer

    // Check if customer exists
    if (customers.data.length > 0) {
      customer = customers.data[0]

      // Update customer metadata with referral code if not already present
      if (referralCode && (!customer.metadata || !customer.metadata.referral)) {
        try {
          customer = await stripe.customers.update(customer.id, {
            metadata: {
              ...customer.metadata,
              referral: referralCode,
            },
          })
          console.log('[REWARDFUL] Updated existing customer with referral:', referralCode)
        } catch (error) {
          console.error('[REWARDFUL] Failed to update customer metadata:', error)
        }
      }
    } else {
      // Create a new customer if not found
      const customerData: any = {
        email: normalizeEmail(email),
        name,
      }

      // Add referral to customer metadata if available
      if (referralCode) {
        customerData.metadata = {
          referral: referralCode,
        }
        console.log('[REWARDFUL] Creating new customer with referral:', referralCode)
      }

      if (token !== 'Trial') {
        customerData.source = token
        customer = await stripe.customers.create(customerData)
      } else {
        customer = await stripe.customers.create(customerData)
      }
    }

    let dataSubcription: DataSubcription

    if (couponCode !== '') {
      dataSubcription = {
        customer: customer.id,
        items: [{ price: priceId }],
        coupon: couponCode,
      }
    } else {
      dataSubcription = {
        customer: customer.id,
        items: [{ price: priceId }],
      }
    }

    if (isTrial) {
      dataSubcription.trial_end = dayjs().add(15, 'd').unix()
      dataSubcription.trial_settings = {
        end_behavior: {
          missing_payment_method: 'cancel',
        },
      }


      return {
        customer_id: customer.id,
        subcription_id: 'Trial',
      }
    }

    // Add referral code to subscription metadata if present
    if (referralCode) {
      if (!dataSubcription.metadata) {
        dataSubcription.metadata = {}
      }
      dataSubcription.metadata.referral = referralCode
      console.log('[REWARDFUL] Adding referral to subscription metadata:', referralCode)
    }

    // Agency Program: Add revenue sharing
    if (agencyAccountId) {
      if (!dataSubcription.metadata) {
        dataSubcription.metadata = {}
      }
      dataSubcription.metadata.agency_account_id = agencyAccountId
      ;(dataSubcription as any).application_fee_percent = revenueSharePercent
      ;(dataSubcription as any).transfer_data = {
        destination: agencyAccountId,
      }
      ;(dataSubcription as any).on_behalf_of = agencyAccountId
      console.log(`[AGENCY_PROGRAM] Subscription with revenue sharing: Platform ${revenueSharePercent}% | Agency ${100 - revenueSharePercent}%`, {
        agencyAccountId,
      })
    }

    const result = await stripe.subscriptions.create(dataSubcription)

    return {
      customer_id: customer.id,
      subcription_id: result.id,
    }
  } catch (error) {
    console.log('Sub Func error = ', error)
    logger.error(error)
    throw error
  }
}

/**
 * Update subcription
 *
 * @param {string} subId
 * @param {string} priceId
 *
 * @returns {Promise<any>}
 */
export async function updateSubcription(subId: string, priceId: string): Promise<boolean> {
  try {
    const subscription = await stripe.subscriptions.retrieve(subId)
    const new_price = await stripe.prices.retrieve(priceId, { expand: ['tiers'] })
    const userStripeId = subscription.customer as string

    let previous_plan
    try {
      previous_plan = await getSitesPlanByCustomerIdAndSubscriptionId(userStripeId, subscription?.id)
    } catch (error) {
      console.log('err = ', error)
    }
    if (new_price?.tiers) {
      if (Number(new_price.tiers[0].up_to) < previous_plan.length) {
        throw new ApolloError(`This plan has a domain limit of ${new_price.tiers[0].up_to}. please decrease your added domains to subscribe to this plan`)
      }
    } else {
      const { metadata } = subscription

      const updatedMetadata: any = { ...metadata, maxDomains: new_price.tiers[0].up_to, usedDomains: Number(previous_plan.length), updateMetaData: 'true' }

      await stripe.subscriptions.update(subId, {
        items: [
          {
            id: subscription.items.data[0].id,
            price: priceId,
          },
        ],
        metadata: updatedMetadata,
      })

      return true
    }
  } catch (error) {
    logger.error(error)
    throw new ApolloError(error.message)
  }
}

/**
 * Cancel subcription
 *
 * @param {string} customerId
 *
 * @returns {Promise<any>}
 */
export async function cancelSubcription(customerId: string): Promise<boolean> {
  try {
    await stripe.customers.del(customerId)

    return true
  } catch (error) {
    logger.error(error)
    throw new ApolloError('Something went wrong!')
  }
}

export async function cancelSubcriptionBySubId(subId: string): Promise<boolean> {
  try {
    await stripe.subscriptions.del(subId)

    return true
  } catch (error) {
    logger.error(error)
    throw error
    // throw new ApolloError('Something went wrong!');
  }
}

export async function getSubcriptionCustomerIDBySubId(subId: string): Promise<string> {
  try {
    const sub = await stripe.subscriptions.retrieve(subId)

    const { customer } = sub

    return String(customer)
  } catch (error) {
    console.log('Sub del func error', error)
    logger.error(error)
    throw new ApolloError('Something went wrong!')
  }
}
