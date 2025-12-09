import { Request, Response } from 'express'

import { sendMailMultiple } from '../services/email/email.service'
import { emailValidation } from '../validations/email.validation'
import compileEmailTemplate from '../helpers/compile-email-template'

interface SendBulkEmailRequest {
  recipients: string[]
  subject: string
  htmlContent: string
}

export async function sendBulkEmail(req: Request, res: Response) {
  const { recipients, subject, htmlContent }: SendBulkEmailRequest = req.body

  try {
    // Validate required fields
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Recipients array is required and must not be empty',
        sentCount: 0,
        failedCount: 0,
      })
    }

    if (!subject || !htmlContent) {
      return res.status(400).json({
        success: false,
        message: 'Subject and HTML content are required',
        sentCount: 0,
        failedCount: 0,
      })
    }

    // Validate all email addresses
    const validRecipients: string[] = []
    const invalidEmails: string[] = []

    for (const email of recipients) {
      const emailValidationResult = emailValidation(email)
      if (Array.isArray(emailValidationResult) && emailValidationResult.length > 0) {
        invalidEmails.push(email)
      } else {
        validRecipients.push(email)
      }
    }

    if (validRecipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid email addresses provided',
        sentCount: 0,
        failedCount: recipients.length,
      })
    }

    // Generate logo URL (same robust logic as other emails)
    const logoUrl = 'https://www.webability.io/images/logo.png'
    const fallbackLogoUrl = 'https://cdn.jsdelivr.net/gh/webability-io/assets/logo.png'
    const altFallbackUrl = 'https://via.placeholder.com/150x40/1565C0/FFFFFF?text=WebAbility'

    // Compile the email template using MJML
    const emailHtml = await compileEmailTemplate({
      fileName: 'bulkEmail.mjml',
      data: {
        subject: subject.trim(),
        content: htmlContent.trim(),
        logoUrl: logoUrl,
        fallbackLogoUrl: fallbackLogoUrl,
        altFallbackUrl: altFallbackUrl,
        year: new Date().getFullYear(),
      },
    })

    // Send email to all valid recipients
    const emailSent = await sendMailMultiple(validRecipients, subject, emailHtml)

    if (emailSent) {
      res.status(200).json({
        success: true,
        message: `Email sent successfully to ${validRecipients.length} recipient(s)${invalidEmails.length > 0 ? `. ${invalidEmails.length} invalid email(s) skipped.` : ''}`,
        sentCount: validRecipients.length,
        failedCount: invalidEmails.length,
      })
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send email',
        sentCount: 0,
        failedCount: validRecipients.length,
      })
    }
  } catch (error) {
    console.error('Error sending bulk email:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      sentCount: 0,
      failedCount: recipients?.length || 0,
    })
  }
}

