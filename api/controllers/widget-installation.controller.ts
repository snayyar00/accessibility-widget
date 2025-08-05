import { Request, Response } from 'express'
import { sendWidgetInstallationInstructions } from '../services/widget/widget-installation.service'
import logger from '../utils/logger'

interface SendWidgetInstallationRequest {
  email: string
  code: string
  position: string
  language: string
  languageName: string
}

export const sendWidgetInstallationInstructionsController = async (req: Request, res: Response) => {
  try {
    const { email, code, position, language, languageName }: SendWidgetInstallationRequest = req.body

    // Validate required fields
    if (!email || !code || !position || !language || !languageName) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required: email, code, position, language, languageName',
      })
    }

    // Validate email format
    const emailRegex = new RegExp(`/^${email}$/`)
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
      })
    }

    // Send the installation instructions
    await sendWidgetInstallationInstructions({
      email,
      code,
      position,
      language,
      languageName,
    })

    logger.info(`Widget installation instructions sent to ${email}`)

    res.json({
      success: true,
      message: 'Installation instructions sent successfully',
    })
  } catch (error) {
    logger.error('Error in sendWidgetInstallationInstructionsController:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to send installation instructions',
    })
  }
}
