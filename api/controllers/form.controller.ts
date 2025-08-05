import { Request, Response } from 'express'

import { addNewsletterSub, unsubscribeFromNewsletter } from '../repository/newsletter_subscribers.repository'
import { findUser, setOnboardingEmailsFlag } from '../repository/user.repository'
import { sendMail } from '../services/email/email.service'
import EmailSequenceService from '../services/email/emailSequence.service'
import { emailValidation } from '../validations/email.validation'

export async function handleFormSubmission(req: Request, res: Response) {
  const validateResult = emailValidation(req.body.email)

  if (Array.isArray(validateResult) && validateResult.length) {
    return res.status(400).json({ error: validateResult.map((it) => it.message).join(',') })
  }

  try {
    await sendMail(
      req.body.email,
      'Welcome to Webability',
      `
          <html>
          <head>
          <style>
              body {
                  font-family: Arial, sans-serif;
                  margin: 20px;
                  color: #333333;
              }
              .script-box {
                  background-color: #f4f4f4;
                  border: 1px solid #dddddd;
                  padding: 15px;
                  overflow: auto;
                  font-family: monospace;
                  margin-top: 20px;
                  white-space: pre-wrap;
              }
              .instructions {
                  margin-bottom: 10px;
              }
          </style>
      </head>
      <body>
          <h1>Welcome to Webability!</h1>
          <p class="instructions">To get started with Webability on your website, please follow these steps:</p>
          <ol>
              <li>Copy the script code provided below.</li>
              <li>Paste it into the HTML of your website, preferably near the closing &lt;/body&gt; tag.</li>
          </ol>
          <div class="script-box">
              &lt;script src="https://widget.webability.io/widget.min.js" data-asw-position="bottom-left" data-asw-lang="en" defer&gt;&lt;/script&gt;
          </div>
          <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
          <p>Thank you for choosing Webability!</p>
      </body>
          </html>
      `,
    )

    return res.status(200).json({ success: true, message: 'Email sent successfully' })
  } catch (error) {
    console.error('Error sending email:', error)
    return res.status(500).json({ error: 'Failed to send email' })
  }
}

export async function subscribeNewsletter(req: Request, res: Response) {
  try {
    const { email } = req.body
    const validateResult = emailValidation(email)

    if (Array.isArray(validateResult) && validateResult.length) {
      return res.status(400).json({ error: validateResult.map((it) => it.message).join(',') })
    }

    await addNewsletterSub(email)
    res.status(200).json({ message: 'Subscription successful' })
  } catch (error) {
    console.error('Error subscribing to newsletter:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}

export async function unsubscribeNewsletter(req: Request, res: Response) {
  try {
    const { email } = req.body
    const validateResult = emailValidation(email)

    if (Array.isArray(validateResult) && validateResult.length) {
      return res.status(400).json({ error: validateResult.map((it) => it.message).join(',') })
    }

    const success = await unsubscribeFromNewsletter(email)
    if (success) {
      res.status(200).json({ message: 'Successfully unsubscribed from newsletter' })
    } else {
      res.status(404).json({ error: 'Email not found in newsletter subscribers' })
    }
  } catch (error) {
    console.error('Error unsubscribing from newsletter:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}

export async function unsubscribe(req: Request, res: Response) {
  try {
    const { email } = req.query

    if (!email || typeof email !== 'string') {
      return res.status(400).send(`
          <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
              <h2 style="color: #dc3545;">Invalid Request</h2>
              <p>Email parameter is required.</p>
            </body>
          </html>
    `)
    }

    // Find user by email
    const user = await findUser({ email })

    if (!user) {
      return res.status(404).send(`
          <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center;">
              <h2 style="color: #ffc107;">Email Not Found</h2>
              <p>The email address was not found in our system.</p>
              <p style="color: #666;">Email: ${email}</p>
              <p style="margin-top: 30px;">
                <a href="https://www.webability.io" style="color: #007bff;">Return to WebAbility</a>
              </p>
            </body>
          </html>
        `)
    }

    // Disable onboarding emails for this user
    const success = await setOnboardingEmailsFlag(user.id, false)

    // Cancel all scheduled emails for this user
    try {
      const cancelledCount = await EmailSequenceService.cancelScheduledEmailsForUser(user.id)
      console.log(`Cancelled ${cancelledCount} scheduled emails for user ${user.id}`)
    } catch (cancelError) {
      console.error('Error cancelling scheduled emails:', cancelError)
      // Don't fail the unsubscribe process if cancellation fails
    }

    // Also unsubscribe from general newsletter for complete unsubscribe
    await unsubscribeFromNewsletter(email)

    if (success) {
      res.status(200).send(`
          <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center;">
              <h2 style="color: #28a745;">✓ Successfully Unsubscribed</h2>
              <p>You have been successfully unsubscribed from WebAbility onboarding emails.</p>
              <p style="color: #666;">Email: ${email}</p>
              <p style="margin-top: 30px;">
                <a href="https://www.webability.io" style="color: #007bff;">Return to WebAbility</a>
              </p>
            </body>
          </html>
        `)
    } else {
      res.status(500).send(`
          <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center;">
              <h2 style="color: #dc3545;">Error</h2>
              <p>An error occurred while processing your unsubscribe request.</p>
              <p style="margin-top: 30px;">
                <a href="https://www.webability.io" style="color: #007bff;">Return to WebAbility</a>
              </p>
            </body>
          </html>
        `)
    }
  } catch (error) {
    console.error('Error processing unsubscribe:', error)
    res.status(500).send(`
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center;">
            <h2 style="color: #dc3545;">Error</h2>
            <p>An error occurred while processing your unsubscribe request.</p>
            <p style="margin-top: 30px;">
              <a href="https://www.webability.io" style="color: #007bff;">Return to WebAbility</a>
            </p>
          </body>
        </html>
      `)
  }
}
