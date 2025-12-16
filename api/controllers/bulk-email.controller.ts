import { Request, Response } from 'express'

import { sendMail } from '../services/email/email.service'
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

    // Deduplicate and normalize email addresses (case-insensitive, trimmed)
    const uniqueEmails = new Set<string>()
    const normalizedRecipients: string[] = []
    
    for (const email of recipients) {
      const normalizedEmail = email.trim().toLowerCase()
      if (!uniqueEmails.has(normalizedEmail)) {
        uniqueEmails.add(normalizedEmail)
        normalizedRecipients.push(email.trim()) // Keep original case for display
      }
    }

    // Validate all email addresses
    const validRecipients: string[] = []
    const invalidEmails: string[] = []

    for (const email of normalizedRecipients) {
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
        failedCount: normalizedRecipients.length,
      })
    }

    // Generate logo URL (same robust logic as other emails)
    const logoUrl = 'https://www.webability.io/images/logo.png'
    const fallbackLogoUrl = 'https://cdn.jsdelivr.net/gh/webability-io/assets/logo.png'
    const altFallbackUrl = 'https://via.placeholder.com/150x40/1565C0/FFFFFF?text=WebAbility'

    // Compile the email template using MJML (compile once, reuse for all recipients)
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

    // Send email individually to each recipient to ensure privacy and one email per recipient
    let sentCount = 0
    let failedCount = 0
    const failedEmails: string[] = []

    for (const recipient of validRecipients) {
      try {
        const emailSent = await sendMail(recipient, subject, emailHtml)
        if (emailSent) {
          sentCount++
        } else {
          failedCount++
          failedEmails.push(recipient)
        }
        // Add a small delay between emails to avoid rate limiting (100ms)
        if (sentCount + failedCount < validRecipients.length) {
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      } catch (error) {
        console.error(`Error sending email to ${recipient}:`, error)
        failedCount++
        failedEmails.push(recipient)
      }
    }

    if (sentCount > 0) {
      res.status(200).json({
        success: true,
        message: `Email sent successfully to ${sentCount} recipient(s)${failedCount > 0 ? `. ${failedCount} email(s) failed to send.` : ''}${invalidEmails.length > 0 ? ` ${invalidEmails.length} invalid email(s) skipped.` : ''}`,
        sentCount: sentCount,
        failedCount: failedCount + invalidEmails.length,
        failedEmails: failedEmails.length > 0 ? failedEmails : undefined,
      })
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send emails to all recipients',
        sentCount: 0,
        failedCount: validRecipients.length + invalidEmails.length,
        failedEmails: failedEmails,
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

