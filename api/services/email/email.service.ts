import { SendSmtpEmail, TransactionalEmailsApi, TransactionalEmailsApiApiKeys } from '@getbrevo/brevo'

interface EmailAttachment {
  content: Buffer
  name: string
}

async function sendMail(to: string, subject: string, html: string, attachments?: EmailAttachment[]) {
  if (!to || to.trim() === '') {
    console.error('Recipient email address is missing or empty.')
    return false
  }

  try {
    // Initialize Brevo API client
    const brevoClient = new TransactionalEmailsApi()

    // Correctly set the API key using two arguments
    brevoClient.setApiKey(TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY as string)

    // Create the email content
    const sendSmtpEmail = new SendSmtpEmail()
    sendSmtpEmail.to = [{ email: to }]
    sendSmtpEmail.sender = { email: process.env.EMAIL_FROM || 'your-email@domain.com' }
    sendSmtpEmail.subject = subject
    sendSmtpEmail.htmlContent = html

    // Add attachments if provided
    if (attachments && attachments.length > 0) {
      sendSmtpEmail.attachment = attachments.map((att) => ({
        content: att.content.toString('base64'),
        name: att.name,
      }))
    }

    const response = await brevoClient.sendTransacEmail(sendSmtpEmail)

    // Check if email was sent successfully
    if (response?.body?.messageId) {
      console.log('Email sent successfully:', response.body.messageId)
      return true
    }
    console.error('Failed to send email: no messageId in response')
    return false
  } catch (error) {
    console.error('Error sending email:', error)
    return false
  }
}

async function sendMailMultiple(recipients: string[], subject: string, html: string, attachments?: EmailAttachment[]) {
  if (!recipients || recipients.length === 0) {
    console.error('No recipients provided.')
    return false
  }

  try {
    // Initialize Brevo API client
    const brevoClient = new TransactionalEmailsApi()

    // Correctly set the API key using two arguments
    brevoClient.setApiKey(TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY as string)

    // Create the email content
    const sendSmtpEmail = new SendSmtpEmail()
    sendSmtpEmail.to = recipients.map((email) => ({ email }))
    sendSmtpEmail.sender = { email: process.env.EMAIL_FROM || 'your-email@domain.com' }
    sendSmtpEmail.subject = subject
    sendSmtpEmail.htmlContent = html

    // Add attachments if provided
    if (attachments && attachments.length > 0) {
      sendSmtpEmail.attachment = attachments.map((att) => ({
        content: att.content.toString('base64'),
        name: att.name,
      }))
    }

    const response = await brevoClient.sendTransacEmail(sendSmtpEmail)

    // Check if email was sent successfully
    if (response?.body?.messageId) {
      console.log('Email sent successfully to multiple recipients:', response.body.messageId)
      return true
    }
    console.error('Failed to send email to multiple recipients: no messageId in response')
    return false
  } catch (error) {
    console.error('Error sending email to multiple recipients:', error)
    return false
  }
}

async function sendEmailWithRetries(
  email: string,
  template: string,
  subject: string,
  maxRetries = 3, // Default to 3 retries
  delay = 2000, // Default to 2 seconds delay
  attachments?: EmailAttachment[],
): Promise<void> {
  let attempt = 0

  while (attempt < maxRetries) {
    attempt += 1

    try {
      console.log(`Attempt ${attempt} to send email to ${email}`)
      await sendMail(email, subject, template, attachments)
      console.log(`Email sent successfully to ${email}`)
      return // Exit the function if email is sent successfully
    } catch (error) {
      console.error(`Failed to send email on attempt ${attempt}:`, error)

      // If max retries reached, throw the error
      if (attempt >= maxRetries) {
        console.error(`Failed to send email after ${maxRetries} attempts.`)
        throw new Error(`Failed to send email to ${email} after ${maxRetries} attempts.`)
      }

      // Wait before retrying
      const retryDelay = delay * 2 ** (attempt - 1) // Exponential backoff
      console.log(`Retrying in ${retryDelay}ms...`)
      await new Promise((resolve) => setTimeout(resolve, retryDelay))
    }
  }
}

async function sendScheduledEmail(to: string, subject: string, html: string, scheduledAt: Date, attachments?: EmailAttachment[]): Promise<{ success: boolean; messageId?: string; batchId?: string }> {
  if (!to || to.trim() === '') {
    console.error('Recipient email address is missing or empty.')
    return { success: false }
  }

  try {
    // Initialize Brevo API client
    const brevoClient = new TransactionalEmailsApi()

    // Correctly set the API key using two arguments
    brevoClient.setApiKey(TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY as string)

    // Create the email content
    const sendSmtpEmail = new SendSmtpEmail()
    sendSmtpEmail.to = [{ email: to }]
    sendSmtpEmail.sender = { email: process.env.EMAIL_FROM || 'your-email@domain.com' }
    sendSmtpEmail.subject = subject
    sendSmtpEmail.htmlContent = html
    sendSmtpEmail.scheduledAt = scheduledAt // Brevo expects Date object, not string

    // Add attachments if provided
    if (attachments && attachments.length > 0) {
      sendSmtpEmail.attachment = attachments.map((att) => ({
        content: att.content.toString('base64'),
        name: att.name,
      }))
    }

    const response = await brevoClient.sendTransacEmail(sendSmtpEmail)

    // Check if email was scheduled successfully
    if (response?.body?.messageId) {
      console.log('Email scheduled successfully:', response.body.messageId)
      return {
        success: true,
        messageId: response.body.messageId,
        // Note: batchId may not be available in all Brevo responses
      }
    }
    console.error('Failed to schedule email: no messageId in response')
    return { success: false }
  } catch (error) {
    console.error('Error scheduling email:', error)
    return { success: false }
  }
}

async function cancelScheduledEmail(messageId: string): Promise<boolean> {
  try {
    // Initialize Brevo API client
    const brevoClient = new TransactionalEmailsApi()

    // Set the API key
    brevoClient.setApiKey(TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY as string)

    // Cancel the scheduled email using DELETE request
    // Note: This might need to be implemented differently based on Brevo SDK version
    // For now, we'll use a fetch request to the API endpoint
    const response = await fetch(`https://api.brevo.com/v3/smtp/email/${messageId}`, {
      method: 'DELETE',
      headers: {
        'api-key': process.env.BREVO_API_KEY as string,
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      console.log('Scheduled email cancelled successfully:', messageId)
      return true
    } else {
      console.error('Failed to cancel scheduled email:', response.status, response.statusText)
      return false
    }
  } catch (error) {
    console.error('Error cancelling scheduled email:', error)
    return false
  }
}

export { cancelScheduledEmail, sendEmailWithRetries, sendMail, sendMailMultiple, sendScheduledEmail }
export type { EmailAttachment }
