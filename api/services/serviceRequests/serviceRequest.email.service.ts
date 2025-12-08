import compileEmailTemplate from '../../helpers/compile-email-template'
import { getUserbyId } from '../../repository/user.repository'
import logger from '../../utils/logger'
import { sendMail } from '../email/email.service'

export interface QuoteRequestEmailData {
  userId: number
  projectName: string
  projectType: string
  projectDetails: string
  frequency?: string
  projectLinks: string[]
}

export interface MeetingRequestEmailData {
  userId: number
  fullName: string
  email: string
  countryCode: string
  phoneNumber: string
  requestedService: string
  message: string
}

/**
 * Format project type from kebab-case to Title Case
 */
function formatProjectType(type: string): string {
  return type
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Format date to readable string
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Send quote request notification email to admin/team
 */
export async function sendQuoteRequestNotification(data: QuoteRequestEmailData): Promise<void> {
  try {
    const user = await getUserbyId(data.userId)
    const year = new Date().getFullYear()

    const template = await compileEmailTemplate({
      fileName: 'quoteRequestReceived.mjml',
      data: {
        projectName: data.projectName,
        projectType: formatProjectType(data.projectType),
        projectDetails: data.projectDetails,
        frequency: data.frequency,
        projectLinks: data.projectLinks,
        userId: data.userId,
        userEmail: user.email,
        userName: user.name || user.email,
        dashboardLink: `${process.env.CLIENT_URL || 'https://app.webability.io'}/service-requests`,
        year,
      },
    })

    // Send to admin email (can be configured via environment variable)
    const adminEmail = process.env.EMAIL_TO || 'admin@webability.io'
    await sendMail(adminEmail, `New Quote Request: ${data.projectName}`, template)

    logger.info(`Quote request notification sent to ${adminEmail}`)
  } catch (error) {
    logger.error('Failed to send quote request notification email:', error)
    // Don't throw - we don't want to fail the request if email fails
  }
}

/**
 * Send meeting request notification email to admin/team
 */
export async function sendMeetingRequestNotification(data: MeetingRequestEmailData): Promise<void> {
  try {
    const year = new Date().getFullYear()

    const template = await compileEmailTemplate({
      fileName: 'meetingRequestReceived.mjml',
      data: {
        fullName: data.fullName,
        email: data.email,
        countryCode: data.countryCode,
        phoneNumber: data.phoneNumber,
        requestedService: formatProjectType(data.requestedService),
        message: data.message,
        userId: data.userId,
        requestDate: formatDate(new Date()),
        dashboardLink: `${process.env.CLIENT_URL || 'https://app.webability.io'}/service-requests`,
        year,
      },
    })

    // Send to admin email (can be configured via environment variable)
    const adminEmail = process.env.EMAIL_TO || 'admin@webability.io'
    await sendMail(adminEmail, `📅 New Meeting Request: ${data.fullName}`, template)

    logger.info(`Meeting request notification sent to ${adminEmail}`)
  } catch (error) {
    logger.error('Failed to send meeting request notification email:', error)
    // Don't throw - we don't want to fail the request if email fails
  }
}

