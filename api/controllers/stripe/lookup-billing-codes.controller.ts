import { Request, Response } from 'express'
import Stripe from 'stripe'

import { findUsersByToken } from '../../repository/user_plan_tokens.repository'
import { findUserById } from '../../repository/user.repository'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY)

interface CodeLookupResult {
  code: string
  found: boolean
  email?: string
  userId?: number
  error?: string
  paymentLink?: string
}

/**
 * Create a Stripe checkout session for a one-time payment of $30 (without sending email)
 */
async function createPaymentLinkPreview(email: string, code: string): Promise<string> {
  // Create or retrieve Stripe customer
  let customers
  try {
    customers = await stripe.customers.list({
      email: email,
      limit: 1,
    })
  } catch (error) {
    console.error('Stripe customers.list error:', error)
    throw new Error('Failed to fetch Stripe customer')
  }

  let customer
  if (customers.data.length > 0) {
    customer = customers.data[0]
  } else {
    try {
      customer = await stripe.customers.create({
        email: email,
      })
    } catch (error) {
      console.error('Stripe customers.create error:', error)
      throw new Error('Failed to create Stripe customer')
    }
  }

  // Create a checkout session for one-time payment of $30
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    customer: customer.id,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'WebAbility Service Payment',
            description: 'Get unlimited access',
          },
          unit_amount: 3000, // $30.00 in cents
        },
        quantity: 1,
      },
    ],
    success_url: `${process.env.FRONTEND_URL?.split(',')[0]?.trim() || 'https://webability.io'}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL?.split(',')[0]?.trim() || 'https://webability.io'}/payment-cancelled`,
    metadata: {
      code: code,
      email: email,
    },
  })

  return session.url || ''
}

/**
 * Lookup codes and return user information without sending emails
 */
export async function lookupBillingCodes(req: Request & { user: any }, res: Response) {
  try {
    const { codes } = req.body

    if (!codes || !Array.isArray(codes) || codes.length === 0) {
      return res.status(400).json({ error: 'Please provide an array of codes' })
    }

    // Filter out empty codes
    const validCodes = codes.filter((code: string) => code && code.trim())

    if (validCodes.length === 0) {
      return res.status(400).json({ error: 'No valid codes provided' })
    }

    const results: CodeLookupResult[] = []

    // Process each code
    for (const code of validCodes) {
      try {
        // Find users by token/code
        const userIds = await findUsersByToken(code.trim())

        if (userIds.length === 0) {
          results.push({
            code: code.trim(),
            found: false,
            error: 'No user found for this code',
          })
          continue
        }

        if (userIds.length > 1) {
          results.push({
            code: code.trim(),
            found: false,
            error: `Multiple users found for this code (${userIds.length} users)`,
          })
          continue
        }

        // Get user email
        const userId = userIds[0]
        const user = await findUserById(userId)

        if (!user || !user.email) {
          results.push({
            code: code.trim(),
            found: false,
            error: 'User email not found',
          })
          continue
        }

        // Create payment link preview (without sending email)
        try {
          const paymentLink = await createPaymentLinkPreview(user.email, code.trim())
          results.push({
            code: code.trim(),
            found: true,
            email: user.email,
            userId: user.id,
            paymentLink,
          })
        } catch (error: any) {
          results.push({
            code: code.trim(),
            found: true,
            email: user.email,
            userId: user.id,
            error: `Failed to create payment link: ${error.message}`,
          })
        }
      } catch (error: any) {
        console.error(`Error processing code ${code}:`, error)
        results.push({
          code: code.trim(),
          found: false,
          error: error.message || 'Unknown error occurred',
        })
      }
    }

    const foundCount = results.filter((r) => r.found).length
    const notFoundCount = results.filter((r) => !r.found).length

    res.status(200).json({
      message: `Looked up ${validCodes.length} codes: ${foundCount} found, ${notFoundCount} not found`,
      total: validCodes.length,
      found: foundCount,
      notFound: notFoundCount,
      results,
    })
  } catch (error: any) {
    console.error('Error in lookupBillingCodes:', error)
    res.status(500).json({ error: 'Internal server error', details: error.message })
  }
}

