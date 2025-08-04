import { findUser, findUserNotificationByUserId, getUserNotificationSettings, insertUserNotification, updateUser, updateUserNotificationFlags } from '../../repository/user.repository'
import { ApolloError } from '../../utils/graphql-errors.helper'
import logger from '../../utils/logger'
import { sanitizeUserInput } from '../../utils/sanitization.helper'
import { createMultipleValidationErrors, createValidationError, getValidationErrorCode } from '../../utils/validation-errors.helper'
import { profileUpdateValidation } from '../../validations/authenticate.validation'

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
    const updatedRows = await updateUserNotificationFlags(userId, flags)

    if (updatedRows > 0) {
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

export async function getUserNotificationSettingsService(userId: number): Promise<any> {
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
