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
            .map((err) => {
              // fastest-validator ValidationError has message, type, field properties
              if (err.message) {
                return err.message
              }
              // Fallback: construct message from type and field
              return err.type === 'email' 
                ? `The email address "${email}" is not valid`
                : `Validation failed for ${err.field || 'email'}: ${err.type || 'invalid format'}`
            })
            .filter(Boolean) // Remove any empty messages
            .join('; ')
          
          const finalMessage = errorMessages || `The email address "${email}" is not valid`
          throw new Error(finalMessage)
        }

        // Send the installation instructions (use org SMTP when configured)
        await sendWidgetInstallationInstructions({
          email,
          code,
          position,
          language,
          languageName,
          organizationId: user.current_organization_id ?? undefined,
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
