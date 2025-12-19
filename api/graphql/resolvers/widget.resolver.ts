import { combineResolvers } from 'graphql-resolvers'

import { sendWidgetInstallationInstructions } from '../../services/widget/widget-installation.service'
import logger from '../../utils/logger'
import { emailValidation } from '../../validations/email.validation'
import { isAuthenticated } from './authorization.resolver'

interface SendWidgetInstallationArgs {
  email: string
  code: string
  position: string
  language: string
  languageName: string
}

const widgetResolvers = {
  Mutation: {
    sendWidgetInstallationInstructions: combineResolvers(isAuthenticated, async (_, args: SendWidgetInstallationArgs, { user }) => {
      try {
        const { email, code, position, language, languageName } = args

        // Validate required fields
        if (!email || !code || !position || !language || !languageName) {
          throw new Error('All fields are required: email, code, position, language, languageName')
        }

        // Validate email format
        const emailValidationResult = await emailValidation(email)

        if (Array.isArray(emailValidationResult) && emailValidationResult.length > 0) {
          // Extract validation error messages for better error reporting
          const errorMessages = emailValidationResult
            .map((err) => err.message || 'Invalid email format')
            .join('; ')
          throw new Error(`Invalid email format: ${errorMessages}`)
        }

        // Send the installation instructions
        await sendWidgetInstallationInstructions({
          email,
          code,
          position,
          language,
          languageName,
        })

        logger.info(`Widget installation instructions sent to ${email} by user ${user.id}`)

        return {
          success: true,
          message: 'Installation instructions sent successfully',
        }
      } catch (error) {
        logger.error('Error in sendWidgetInstallationInstructions resolver:', error)
        throw new Error(error instanceof Error ? error.message : 'Failed to send installation instructions')
      }
    }),
  },
}

export default widgetResolvers
