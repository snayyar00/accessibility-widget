import { Request, Response } from 'express'
import { sendMail, EmailAttachment } from '../services/email/email.service'
import compileEmailTemplate from '../helpers/compile-email-template'

interface SendToolkitEmailRequest {
  email: string
  domain: string
  zipFileBase64: string
  reportDate?: string
}

export async function sendProofOfEffortToolkit(req: Request, res: Response) {
  const { user } = req as any
  const { email, domain, zipFileBase64, reportDate }: SendToolkitEmailRequest = req.body

  try {
    // Validate required fields
    if (!email || !domain || !zipFileBase64) {
      return res.status(400).json({
        success: false,
        message: 'Email, domain, and zip file are required',
      })
    }

    // Validate email format
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
      })
    }

    // Prepare template variables
    const templateVariables = {
      domain,
      reportDate: reportDate || 'Latest',
      year: new Date().getFullYear(),
      generatedDate: new Date().toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    }

    // Compile the email template
    const emailHtml = await compileEmailTemplate({
      fileName: 'proofOfEffortToolkit.mjml',
      data: templateVariables,
    })

    // Validate and convert base64 zip file to buffer
    let zipBuffer: Buffer
    try {
      // Check if the string is valid base64 format
      if (!zipFileBase64.match(/^[A-Za-z0-9+/]*={0,2}$/)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid base64 format for zip file',
        })
      }

      zipBuffer = Buffer.from(zipFileBase64, 'base64')

      // Check if the conversion resulted in a valid buffer with content
      if (zipBuffer.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or empty zip file data',
        })
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid base64 zip file format',
      })
    }

    // Prepare email attachment
    const attachment: EmailAttachment = {
      content: zipBuffer,
      name: `${domain}-proof-of-effort-toolkit.zip`,
    }

    // Send the email
    const emailSent = await sendMail(email, `Your Proof of Effort Toolkit for ${domain}`, emailHtml, [attachment])

    if (emailSent) {
      res.status(200).json({
        success: true,
        message: 'Proof of effort toolkit sent successfully',
      })
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send email',
      })
    }
  } catch (error) {
    console.error('Error sending proof of effort toolkit:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
}
