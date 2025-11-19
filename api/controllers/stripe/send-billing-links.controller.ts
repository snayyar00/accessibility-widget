import { Request, Response } from 'express'
import Stripe from 'stripe'
import multer from 'multer'
import dayjs from 'dayjs'

import { findUsersByToken } from '../../repository/user_plan_tokens.repository'
import { findUserById } from '../../repository/user.repository'
import { sendMail } from '../../services/email/email.service'
import compileEmailTemplate from '../../helpers/compile-email-template'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY)

// Configure multer for file upload
const upload = multer({ storage: multer.memoryStorage() })

interface CodeResult {
  code: string
  success: boolean
  email?: string
  error?: string
  paymentLink?: string
}

/**
 * Parse CSV file and extract codes
 * Simple CSV parser that handles the format: code,purchase_date,refund_date,reason,feedback
 */
function parseCSV(buffer: Buffer): string[] {
  const codes: string[] = []
  const content = buffer.toString('utf-8')
  const lines = content.split('\n').filter((line) => line.trim())

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Parse CSV line (handling quoted values)
    const columns: string[] = []
    let current = ''
    let inQuotes = false

    for (let j = 0; j < line.length; j++) {
      const char = line[j]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        columns.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    columns.push(current.trim()) // Add last column

    // First column is the code
    const code = columns[0]?.replace(/^"|"$/g, '').trim() // Remove surrounding quotes
    if (code && code.length > 0) {
      codes.push(code)
    }
  }

  return codes
}

/**
 * Create a Stripe checkout session for a one-time payment of $30
 */
async function createPaymentLink(email: string, code: string): Promise<string> {
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
 * Send billing link email to user
 */
async function sendBillingLinkEmail(email: string, code: string, paymentLink: string): Promise<boolean> {
  try {
    const subject = "We'd love to have you back - Your WebAbility account is ready"
    
    // Use the hosted Past Customer logo URL
    const pastCustomerLogoUrl = 'https://cdn.webability.io/organizations/86/logo-7c77cc04-7d5f-47ef-a590-8bb855edddf9.png'
    
    // Compile the MJML email template
    const html = await compileEmailTemplate({
      fileName: 'billingLink.mjml',
      data: {
        code,
        paymentLink,
        year: dayjs().year(),
        pastCustomerLogo: pastCustomerLogoUrl,
      },
    })

    return await sendMail(email, subject, html)
  } catch (error) {
    console.error('Error compiling email template:', error)
    // Fallback to simple HTML if template compilation fails
    const subject = 'Your WebAbility Billing Link'
    const fallbackHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .button:hover { background-color: #0056b3; }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Payment Request</h2>
          <p>Hello,</p>
          <p>We have generated a billing link for your account associated with code: <strong>${code}</strong></p>
          <p>Please click the button below to complete your payment of $30.00:</p>
          <a href="${paymentLink}" class="button">Pay $30.00</a>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #007bff;">${paymentLink}</p>
          <p>If you have any questions, please contact our support team.</p>
          <div class="footer">
            <p>Best regards,<br>The WebAbility Team</p>
          </div>
        </div>
      </body>
      </html>
    `
    return await sendMail(email, subject, fallbackHtml)
  }
}

/**
 * Process codes and send billing links
 */
export async function sendBillingLinks(req: Request & { user: any }, res: Response) {
  try {
    let codes: string[] = []

    // Check if request has file (CSV upload)
    if (req.file) {
      try {
        codes = parseCSV(req.file.buffer)
      } catch (error: any) {
        return res.status(400).json({ error: 'Failed to parse CSV file', details: error.message })
      }
    } else if (req.body.codes && Array.isArray(req.body.codes)) {
      // Accept array of codes directly
      codes = req.body.codes.filter((code: string) => code && code.trim())
    } else if (req.body.code) {
      // Accept single code
      codes = [req.body.code]
    } else {
      return res.status(400).json({ error: 'Please provide a CSV file or array of codes' })
    }

    if (codes.length === 0) {
      return res.status(400).json({ error: 'No valid codes found' })
    }

    const results: CodeResult[] = []

    // Process each code
    for (const code of codes) {
      try {
        // Find users by token/code
        const userIds = await findUsersByToken(code)

        if (userIds.length === 0) {
          results.push({
            code,
            success: false,
            error: 'No user found for this code',
          })
          continue
        }

        if (userIds.length > 1) {
          results.push({
            code,
            success: false,
            error: `Multiple users found for this code (${userIds.length} users)`,
          })
          continue
        }

        // Get user email
        const userId = userIds[0]
        const user = await findUserById(userId)

        if (!user || !user.email) {
          results.push({
            code,
            success: false,
            error: 'User email not found',
          })
          continue
        }

        // Create Stripe payment link
        const paymentLink = await createPaymentLink(user.email, code)

        // Send email with billing link
        const emailSent = await sendBillingLinkEmail(user.email, code, paymentLink)

        if (emailSent) {
          results.push({
            code,
            success: true,
            email: user.email,
            paymentLink,
          })
        } else {
          results.push({
            code,
            success: false,
            email: user.email,
            error: 'Failed to send email',
            paymentLink,
          })
        }
      } catch (error) {
        console.error(`Error processing code ${code}:`, error)
        results.push({
          code,
          success: false,
          error: error.message || 'Unknown error occurred',
        })
      }
    }

    const successCount = results.filter((r) => r.success).length
    const failureCount = results.filter((r) => !r.success).length

    res.status(200).json({
      message: `Processed ${codes.length} codes: ${successCount} successful, ${failureCount} failed`,
      total: codes.length,
      successful: successCount,
      failed: failureCount,
      results,
    })
  } catch (error) {
    console.error('Error in sendBillingLinks:', error)
    res.status(500).json({ error: 'Internal server error', details: error.message })
  }
}

// Export multer middleware for file upload
export const uploadMiddleware = upload.single('csvFile')

