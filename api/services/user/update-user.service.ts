import { ORGANIZATION_MANAGEMENT_ROLES } from '../../constants/organization.constant'
import { checkOnboardingEmailsEnabled, findUser, findUserNotificationByUserId, getUserNotificationSettings, insertUserNotification, updateUser, updateUserNotificationFlags, UserProfile } from '../../repository/user.repository'
import { ApolloError, ForbiddenError } from '../../utils/graphql-errors.helper'
import logger from '../../utils/logger'
import { sanitizeUserInput } from '../../utils/sanitization.helper'
import { createMultipleValidationErrors, createValidationError, getValidationErrorCode } from '../../utils/validation-errors.helper'
import { profileUpdateValidation } from '../../validations/authenticate.validation'
import { getUserOrganization } from '../organization/organization_users.service'

export async function updateProfile(id: number, name: string, company: string, position: string): Promise<true | ApolloError> {
  try {
    const sanitizedInput = sanitizeUserInput({ name, company, position })

    name = sanitizedInput.name
    company = sanitizedInput.company
    position = sanitizedInput.position

    const validateResult = profileUpdateValidation({ name, company, position })

    if (Array.isArray(validateResult) && validateResult.length) {
      const errorMessages = validateResult.map((it) => it.message)

      if (errorMessages.length > 1) {
        throw createMultipleValidationErrors(errorMessages)
      } else {
        const errorCode = getValidationErrorCode(errorMessages)
        throw createValidationError(errorCode, errorMessages[0])
      }
    }

    const user = await findUser({ id })

    if (!user) {
      return new ApolloError('Can not find any user')
    }

    await updateUser(id, { name, position, company })
    return true
  } catch (error) {
    logger.error(error)
    throw new ApolloError('Something went wrong!')
  }
}

export async function updateUserNotificationSettings(
  userId: number,
  flags: {
    monthly_report_flag?: boolean
    new_domain_flag?: boolean
    issue_reported_flag?: boolean
    onboarding_emails_flag?: boolean
  },
): Promise<{ success: boolean; message: string }> {
  try {
    // Check current onboarding email status before updating
    const currentOnboardingStatus = flags.onboarding_emails_flag !== undefined ? await checkOnboardingEmailsEnabled(userId) : null

    const updatedRows = await updateUserNotificationFlags(userId, flags)

    if (updatedRows > 0) {
      // Handle onboarding email preference changes
      if (flags.onboarding_emails_flag !== undefined && currentOnboardingStatus !== null) {
        try {
          // Import EmailSequenceService for email management
          const { default: EmailSequenceService } = await import('../email/emailSequence.service')

          if (flags.onboarding_emails_flag === true && currentOnboardingStatus === false) {
            // User re-enabled onboarding emails - trigger recovery
            console.log(`User ${userId} re-enabled onboarding emails - triggering recovery...`)

            // Trigger email recovery in the background (don't wait for completion)
            EmailSequenceService.recoverMissedEmailsForUser(userId)
              .then((result) => {
                console.log(`Email recovery completed for user ${userId}:`, result)
              })
              .catch((error) => {
                console.error(`Email recovery failed for user ${userId}:`, error)
              })
          } else if (flags.onboarding_emails_flag === false && currentOnboardingStatus === true) {
            // User disabled onboarding emails
            console.log(`User ${userId} disabled onboarding emails`)
            // Note: No need to cancel scheduled emails since we use immediate sending
          }
        } catch (error) {
          console.error(`Failed to handle email preference change for user ${userId}:`, error)
          // Don't fail the settings update if email handling fails
        }
      }

      return {
        success: true,
        message: 'Notification settings updated successfully',
      }
    } else {
      return {
        success: false,
        message: 'No settings were updated',
      }
    }
  } catch (error) {
    console.error('Error updating notification settings:', error)
    return {
      success: false,
      message: 'Failed to update notification settings',
    }
  }
}

export async function getUserNotificationSettingsService(userId: number): Promise<unknown> {
  try {
    const notification = await findUserNotificationByUserId(userId)

    if (!notification) {
      try {
        await insertUserNotification(userId)
        console.log('User added to notification')
      } catch (error) {
        console.error('Failed to add user to notification:', error)
      }
    }
    const settings = await getUserNotificationSettings(userId)

    return (
      settings || {
        monthly_report_flag: false,
        new_domain_flag: false,
        issue_reported_flag: false,
        onboarding_emails_flag: true, // Default to enabled for new users
      }
    )
  } catch (error) {
    console.error('Error getting notification settings:', error)

    return {
      monthly_report_flag: false,
      new_domain_flag: false,
      issue_reported_flag: false,
      onboarding_emails_flag: true, // Default to enabled for new users
    }
  }
}

export async function changeCurrentOrganization(initiator: UserProfile, targetOrganizationId: number, userId?: number): Promise<true | ApolloError> {
  try {
    if (!initiator.current_organization_id) {
      throw new ForbiddenError('Current organization not found')
    }

    await checkRoleInOrganization(initiator.id, initiator.current_organization_id)
    await checkRoleInOrganization(initiator.id, targetOrganizationId)

    if (userId && userId !== initiator.id) {
      const targetUser = await getUserOrganization(userId, targetOrganizationId)

      if (!targetUser) {
        throw new ForbiddenError('Target user does not belong to the target organization')
      }

      await updateUser(userId, { current_organization_id: targetOrganizationId })
    } else {
      await updateUser(initiator.id, { current_organization_id: targetOrganizationId })
    }

    return true
  } catch (error) {
    logger.error(error)
    throw new ForbiddenError('Failed to change current organization')
  }
}

async function checkRoleInOrganization(userId: number, organizationId: number) {
  const orgUser = await getUserOrganization(userId, organizationId)

  if (!orgUser) {
    throw new ForbiddenError('User does not belong to the organization')
  }

  const isAllowed = ORGANIZATION_MANAGEMENT_ROLES.includes(orgUser.role as (typeof ORGANIZATION_MANAGEMENT_ROLES)[number])

  if (!isAllowed) {
    throw new ForbiddenError('User must be owner or admin of the organization to switch organization')
  }
}
