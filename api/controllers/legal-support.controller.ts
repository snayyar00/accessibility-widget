import { Request, Response } from 'express'

import compileEmailTemplate from '../helpers/compile-email-template'
import { sendMail } from '../services/email/email.service'
import { emailValidation } from '../validations/email.validation'

interface LegalSupportRequest {
  complaintType: string
  complaintDate: string
  name: string
  email: string
}

export async function sendLegalSupportRequest(req: Request, res: Response) {
  const { complaintType, complaintDate, name, email }: LegalSupportRequest = req.body

  try {
    // Validate required fields
    if (!complaintType || !complaintDate || !name || !email) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      })
    }

    // Validate email format
    const emailValidationResult = emailValidation(email)

    if (Array.isArray(emailValidationResult) && emailValidationResult.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
      })
    }

    // Get user info from request (if available)
    const user = (req as any).user
    const userId = user?.id || 'N/A'
    const userEmail = user?.email || email

    // Prepare template variables
    const templateVariables = {
      complaintType,
      complaintDate,
      name,
      email: userEmail,
      userId,
      year: new Date().getFullYear(),
      requestDate: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    }

    // Compile the email template
    const emailHtml = await compileEmailTemplate({
      fileName: 'legalSupportRequest.mjml',
      data: templateVariables,
    })

    // Send to admin email (configured via EMAIL_TO environment variable)
    const adminEmail = process.env.EMAIL_TO || 'admin@webability.io'
    const emailSent = await sendMail(
      adminEmail,
      `Legal Support Request: ${complaintType} - ${name}`,
      emailHtml,
      undefined,
      'WebAbility Team',
    )

    if (emailSent) {
      res.status(200).json({
        success: true,
        message: 'Legal support request submitted successfully',
      })
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send legal support request',
      })
    }
  } catch (error) {
    console.error('Error sending legal support request:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
}

