import { Request, Response } from 'express'

import { addNewsletterSub, unsubscribeFromNewsletter } from '../repository/newsletter_subscribers.repository'
import { findUser, setOnboardingEmailsFlag, updateUserNotificationFlags } from '../repository/user.repository'
import { sendMail } from '../services/email/email.service'
import { emailValidation } from '../validations/email.validation'
import { verifyUnsubscribeToken } from '../utils/secure-unsubscribe.utils'

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
    const { email, type } = req.query

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

    let success = false
    let message = ''

    // Handle different types of unsubscribe
    if (type === 'monitoring') {
      // Disable monitoring alerts
      const updated = await updateUserNotificationFlags(user.id, {
        monitoring_alert_flag: false,
      })
      success = updated > 0
      message = 'You have been successfully unsubscribed from WebAbility monitoring alerts.<br/>You will no longer receive email notifications when your websites go down or come back online.'
    } else if (type === 'monthly') {
      // Disable monthly reports
      const updated = await updateUserNotificationFlags(user.id, {
        monthly_report_flag: false,
      })
      success = updated > 0
      message = 'You have been successfully unsubscribed from WebAbility monthly accessibility reports.<br/>You will no longer receive monthly accessibility reports for your websites.'
    } else if (type === 'domain') {
      // Disable new domain alerts
      const updated = await updateUserNotificationFlags(user.id, {
        new_domain_flag: false,
      })
      success = updated > 0
      message = 'You have been successfully unsubscribed from WebAbility new domain alerts.<br/>You will no longer receive email notifications when new domains are added to your account.'
    } else {
      // Default: Disable onboarding emails
      success = await setOnboardingEmailsFlag(user.id, false)

      // Also unsubscribe from general newsletter for complete unsubscribe
      await unsubscribeFromNewsletter(email)
      message = 'You have been successfully unsubscribed from WebAbility onboarding emails.'
    }

    if (success) {
      res.status(200).send(`
          <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center;">
              <h2 style="color: #28a745;">✓ Successfully Unsubscribed</h2>
              <p>${message}</p>
              <p style="color: #666;">Email: ${email}</p>
              <p style="margin-top: 20px; color: #666; font-size: 14px;">
                You can re-enable notifications anytime from your dashboard settings.
              </p>
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

export async function secureUnsubscribe(req: Request, res: Response) {
  try {
    const { token } = req.query

    if (!token || typeof token !== 'string') {
      return res.status(400).send(`
          <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
              <h2 style="color: #dc3545;">Invalid Request</h2>
              <p>Valid unsubscribe token is required.</p>
              <p style="margin-top: 30px;">
                <a href="https://www.webability.io" style="color: #007bff;">Return to WebAbility</a>
              </p>
            </body>
          </html>
    `)
    }

    // Verify and decode the token
    const payload = verifyUnsubscribeToken(token)

    if (!payload) {
      return res.status(400).send(`
          <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center;">
              <h2 style="color: #dc3545;">Invalid or Expired Token</h2>
              <p>This unsubscribe link is invalid or has expired.</p>
              <p style="color: #666;">Please use a recent unsubscribe link from your email.</p>
              <p style="margin-top: 30px;">
                <a href="https://www.webability.io" style="color: #007bff;">Return to WebAbility</a>
              </p>
            </body>
          </html>
        `)
    }

    // Find user by ID for additional security
    const user = await findUser({ id: payload.userId })

    if (!user || user.email !== payload.email) {
      return res.status(404).send(`
          <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center;">
              <h2 style="color: #ffc107;">User Not Found</h2>
              <p>The user associated with this unsubscribe link was not found.</p>
              <p style="margin-top: 30px;">
                <a href="https://www.webability.io" style="color: #007bff;">Return to WebAbility</a>
              </p>
            </body>
          </html>
        `)
    }

    let success = false
    let message = ''

    // Handle different types of unsubscribe based on token payload
    if (payload.type === 'monitoring') {
      const updated = await updateUserNotificationFlags(user.id, {
        monitoring_alert_flag: false,
      })
      success = updated > 0
      message = 'You have been successfully unsubscribed from WebAbility monitoring alerts.<br/>You will no longer receive email notifications when your websites go down or come back online.'
    } else if (payload.type === 'monthly') {
      const updated = await updateUserNotificationFlags(user.id, {
        monthly_report_flag: false,
      })
      success = updated > 0
      message = 'You have been successfully unsubscribed from WebAbility monthly accessibility reports.<br/>You will no longer receive monthly accessibility reports for your websites.'
    } else if (payload.type === 'domain') {
      const updated = await updateUserNotificationFlags(user.id, {
        new_domain_flag: false,
      })
      success = updated > 0
      message = 'You have been successfully unsubscribed from WebAbility new domain alerts.<br/>You will no longer receive email notifications when new domains are added to your account.'
    } else if (payload.type === 'onboarding') {
      success = await setOnboardingEmailsFlag(user.id, false)
      message = 'You have been successfully unsubscribed from WebAbility onboarding emails.<br/>You will no longer receive onboarding and educational emails from us.'
    } else if (payload.type === 'issue_reports') {
      const updated = await updateUserNotificationFlags(user.id, {
        issue_reported_flag: false,
      })
      success = updated > 0
      message = 'You have been successfully unsubscribed from WebAbility issue report notifications.<br/>You will no longer receive email notifications when issues are reported on your websites.'
    }

    if (success) {
      res.status(200).send(`
          <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center;">
              <h2 style="color: #28a745;">✓ Successfully Unsubscribed</h2>
              <p>${message}</p>
              <p style="color: #666;">Email: ${user.email}</p>
              <p style="margin-top: 20px; color: #666; font-size: 14px;">
                You can re-enable notifications anytime from your dashboard settings.
              </p>
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
    console.error('Error processing secure unsubscribe:', error)
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
