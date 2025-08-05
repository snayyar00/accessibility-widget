import { sendMail } from '../email/email.service'
import compileEmailTemplate from '../../helpers/compile-email-template'
import logger from '../../utils/logger'

interface WidgetInstallationData {
  email: string
  code: string
  position: string
  language: string
  languageName: string
}

export async function sendWidgetInstallationInstructions(data: WidgetInstallationData): Promise<boolean> {
  try {
    const { email, code, position, language, languageName } = data

    // Format position for display
    const formattedPosition = position.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())

    // Compile the email template
    const template = await compileEmailTemplate({
      fileName: 'widgetInstallation.mjml',
      data: {
        code,
        position: formattedPosition,
        language,
        languageName
      }
    })

    // Send the email
    await sendMail(
      email,
      'Your WebAbility Widget Installation Instructions',
      template
    )

    logger.info(`Widget installation instructions sent successfully to ${email}`)
    return true

  } catch (error) {
    logger.error('Error sending widget installation instructions:', error)
    throw new Error('Failed to send widget installation instructions')
  }
}

export async function sendWidgetInstallationInstructionsWithRetry(
  data: WidgetInstallationData,
  maxRetries: number = 3,
  delayMs: number = 2000
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await sendWidgetInstallationInstructions(data)
    } catch (error) {
      logger.warn(`Attempt ${attempt} failed to send widget installation instructions to ${data.email}:`, error)
      
      if (attempt === maxRetries) {
        logger.error(`Failed to send widget installation instructions after ${maxRetries} attempts`)
        throw error
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }
  
  return false
} 