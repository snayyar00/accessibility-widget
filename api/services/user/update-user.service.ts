import { ORGANIZATION_MANAGEMENT_ROLES } from '../../constants/organization.constant'
import { findUser, findUserNotificationByUserId, getUserNotificationSettings, insertUserNotification, updateUser, updateUserNotificationFlags, UserProfile } from '../../repository/user.repository'
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
      }
    )
  } catch (error) {
    console.error('Error getting notification settings:', error)

    return {
      monthly_report_flag: false,
      new_domain_flag: false,
      issue_reported_flag: false,
    }
  }
}

export async function changeCurrentOrganization(user: UserProfile, organizationId: number): Promise<true | ApolloError> {
  try {
    // Check if user has a current organization
    if (!user.current_organization_id) {
      return new ForbiddenError('Current organization not found')
    }

    // Check user's role in the current organization
    const currentOrgUser = await getUserOrganization(user.id, user.current_organization_id)

    if (!currentOrgUser) {
      return new ForbiddenError('User does not belong to the current organization')
    }

    const isAllowed = ORGANIZATION_MANAGEMENT_ROLES.includes(currentOrgUser.role as (typeof ORGANIZATION_MANAGEMENT_ROLES)[number])

    if (!isAllowed) {
      return new ForbiddenError('User must be owner or admin of the current organization to switch organization')
    }

    // Check if user belongs to the target organization
    const targetOrgUser = await getUserOrganization(user.id, organizationId)

    if (!targetOrgUser) {
      return new ForbiddenError('User does not belong to the target organization')
    }

    await updateUser(user.id, { current_organization_id: organizationId })

    return true
  } catch (error) {
    logger.error(error)
    throw new ForbiddenError('Failed to change current organization')
  }
}
