import { combineResolvers } from 'graphql-resolvers'
import { isAuthenticated } from './authorization.resolver'
import { sendWidgetInstallationInstructions } from '../../services/widget/widget-installation.service'
import logger from '../../utils/logger'
import { emailValidation } from '../../validations/email.validation'

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
        const emailValidationResult = emailValidation(email)

        if (Array.isArray(emailValidationResult) && emailValidationResult.length > 0) {
          throw new Error('Invalid email format')
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
