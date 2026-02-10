import { Request, Response } from 'express'
import { existsSync, readFileSync } from 'fs'
import { join, resolve } from 'path'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

import compileEmailTemplate from '../helpers/compile-email-template'
import { sendMail } from '../services/email/email.service'
import { getOrganizationSmtpConfig } from '../utils/organizationSmtp.utils'
import { UserLogined } from '../services/authentication/get-user-logined.service'
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
    const smtpConfig =
      user?.current_organization_id != null
        ? await getOrganizationSmtpConfig(user.current_organization_id)
        : null
    const emailSent = await sendMail(
      adminEmail,
      `Legal Support Request: ${complaintType} - ${name}`,
      emailHtml,
      undefined,
      'WebAbility Team',
      smtpConfig,
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

/**
 * Serve PDF file for Legal Action Response Plan or Trusted Certification
 * Adds user's name and email at the top of the first page
 */
export async function downloadLegalPDF(req: Request & { user?: UserLogined }, res: Response) {
  try {
    const { type } = req.params
    const { domain } = req.query

    // Validate PDF type
    if (type !== 'legal-action-response-plan' && type !== 'trusted-certification') {
      return res.status(400).json({
        success: false,
        message: 'Invalid PDF type',
      })
    }

    // Get user information
    const user = req.user
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      })
    }

    // Get website URL from query parameter
    let websiteUrl = typeof domain === 'string' ? domain : null
    
    // Log for debugging
    console.log('PDF Download - Domain from query:', domain, 'Website URL:', websiteUrl)
    
    // If no domain provided, try to get first site from user's sites as fallback
    if (!websiteUrl && user.current_organization_id) {
      try {
        const { findSitesByUserId } = await import('../repository/sites_allowed.repository')
        const userSites = await findSitesByUserId(user.id)
        if (userSites && userSites.length > 0) {
          websiteUrl = userSites[0].url || null
          console.log('PDF Download - Using first site as fallback:', websiteUrl)
        }
      } catch (error) {
        console.error('Error fetching user sites for PDF:', error)
      }
    }
    
    // Final fallback to email if no website URL available
    if (!websiteUrl) {
      websiteUrl = user.email
      console.log('PDF Download - Using email as fallback:', websiteUrl)
    }

    // Determine PDF file name based on type
    const pdfFileName =
      type === 'legal-action-response-plan'
        ? 'Legal Action Response Plan.pdf'
        : 'Trusted Certification.pdf'

    // Try multiple possible paths for the PDF file
    const possiblePaths = [
      // Path from API directory (if PDFs are copied to api/public)
      join(resolve(), 'public', 'pdfs', pdfFileName),
      // Path from project root (if PDFs are in app/src/assets/pdf)
      join(resolve(), '..', 'app', 'src', 'assets', 'pdf', pdfFileName),
      // Path from API directory relative to app
      join(resolve(), 'app', 'src', 'assets', 'pdf', pdfFileName),
    ]

    let pdfPath: string | null = null
    for (const path of possiblePaths) {
      if (existsSync(path)) {
        pdfPath = path
        break
      }
    }

    if (!pdfPath) {
      console.error('PDF file not found. Tried paths:', possiblePaths)
      return res.status(404).json({
        success: false,
        message: 'PDF file not found',
      })
    }

    // Read the PDF file
    const pdfBytes = readFileSync(pdfPath)

    // Load the PDF document
    const pdfDoc = await PDFDocument.load(pdfBytes)

    // Get the first page
    const pages = pdfDoc.getPages()
    if (pages.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'PDF has no pages',
      })
    }

    const firstPage = pages[0]
    const { width, height } = firstPage.getSize()

    // Only add user information for Legal Action Response Plan, not for Trusted Certification
    if (type === 'legal-action-response-plan') {
      // Embed a standard font
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

      // Add user information at the top of the page
      // Positioned lower to avoid overlapping with existing PDF content
      const topMargin = 100 // Distance from top (moved down further to avoid layout conflicts)
      const leftMargin = 25 // Distance from left
      const lineHeight = 14 // Space between lines
      let currentY = height - topMargin

      // Add "Hi" and user name (not bold, smaller)
      if (user.name) {
        const nameText = `Hi ${user.name}`
        firstPage.drawText(nameText, {
          x: leftMargin,
          y: currentY,
          size: 10, // Reduced from 12
          font: helveticaFont, // Not bold
          color: rgb(0, 0, 0), // Black
        })
        currentY -= lineHeight + 5 // Extra space before URL
      }

      // Add website URL (bold, larger) instead of email
      // Always show something - either website URL or email as fallback
      if (websiteUrl) {
        firstPage.drawText(websiteUrl, {
          x: leftMargin,
          y: currentY,
          size: 12, // Increased from 10
          font: helveticaBoldFont, // Bold
          color: rgb(0.2, 0.2, 0.2), // Dark gray
        })
      }
    }

    // Serialize the PDF to bytes
    const modifiedPdfBytes = await pdfDoc.save()

    // Set appropriate headers for PDF download
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${pdfFileName}"`)
    res.setHeader('Content-Length', modifiedPdfBytes.length.toString())

    // Send the modified PDF file
    res.send(Buffer.from(modifiedPdfBytes))
  } catch (error) {
    console.error('Error serving PDF file:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    })
  }
}

