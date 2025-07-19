import { ApolloError } from 'apollo-server-express'
import dayjs from 'dayjs'
import Stripe from 'stripe'

import logger from '../../config/logger.config'
import { normalizeEmail } from '../../helpers/string.helper'
import { getSitesPlanByCustomerIdAndSubscriptionId } from '../../repository/sites_plans.repository'

export type DataSubcription = {
  customer: string
  items?: {
    price: string
  }[]
  trial_end?: number
  hosted_invoice_url?: string
  coupon?: string
  trial_settings?: any
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
 * @returns {Promise<any>}
 */
export async function createNewSubcription(token: string, email: string, name: string, priceId: string, isTrial = false, couponCode = ''): Promise<NewSubcription> {
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
      // console.log("customer exists = ",customer);
    } else {
      // Create a new customer if not found
      if (token !== 'Trial') {
        customer = await stripe.customers.create({
          email: normalizeEmail(email),
          name,
          source: token,
        })
      } else {
        customer = await stripe.customers.create({
          email: normalizeEmail(email),
          name,
        })
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
    const result = await stripe.subscriptions.create(dataSubcription)

    return {
      customer_id: customer.id,
      subcription_id: result.id,
    }
  } catch (error) {
    console.log('Sub Func error = ', error)
    logger.error(error)
    throw new ApolloError('Payment failed! Please check your card.')
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
