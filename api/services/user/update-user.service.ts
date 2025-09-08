import { updateOrganizationUserByOrganizationAndUserId } from '../../repository/organization_user.repository'
import { checkOnboardingEmailsEnabled, findUser, findUserNotificationByUserId, getUserNotificationSettings, insertUserNotification, updateUser, updateUserNotificationFlags, UserProfile } from '../../repository/user.repository'
import { getWorkspace } from '../../repository/workspace.repository'
import { canManageOrganization } from '../../utils/access.helper'
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
    monitoring_alert_flag?: boolean
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

    const targetUserId = userId || initiator.id
    const switchingOtherUser = userId && userId !== initiator.id

    await checkCanSwitchEntity(initiator, targetUserId, targetOrganizationId, switchingOtherUser)
    await updateUser(targetUserId, { current_organization_id: targetOrganizationId })

    logger.info({
      message: 'Organization switched',
      initiatorId: initiator.id,
      targetUserId,
      targetOrganizationId,
    })

    return true
  } catch (error) {
    logger.error(error)
    throw new ForbiddenError('Failed to change current organization')
  }
}

export async function changeCurrentWorkspace(initiator: UserProfile, targetWorkspaceId: number | null, userId?: number): Promise<true | ApolloError> {
  try {
    if (!initiator.current_organization_id) {
      throw new ForbiddenError('Current organization not found')
    }

    const targetUserId = userId || initiator.id
    const switchingOtherUser = userId && userId !== initiator.id

    await checkCanSwitchEntity(initiator, targetUserId, initiator.current_organization_id, switchingOtherUser)

    if (targetWorkspaceId) {
      const workspace = await getWorkspace({
        id: targetWorkspaceId,
        organization_id: initiator.current_organization_id,
      })

      if (!workspace) {
        throw new ForbiddenError('Workspace not found or does not belong to organization')
      }
    }

    await updateOrganizationUserByOrganizationAndUserId(initiator.current_organization_id, targetUserId, { current_workspace_id: targetWorkspaceId })

    logger.info({
      message: 'Workspace switched',
      initiatorId: initiator.id,
      targetUserId,
      targetWorkspaceId,
      organizationId: initiator.current_organization_id,
    })

    return true
  } catch (error) {
    logger.error(error)
    throw new ForbiddenError('Failed to change current workspace')
  }
}

async function checkCanSwitchEntity(initiator: UserProfile, targetUserId: number, targetOrganizationId: number, requireAdmin = false) {
  const targetOrgUser = await getUserOrganization(targetUserId, targetOrganizationId)

  if (!targetOrgUser) {
    throw new ForbiddenError('Target user does not belong to the organization')
  }

  if (requireAdmin) {
    const initiatorOrg = await getUserOrganization(initiator.id, targetOrganizationId)
    const isAllowed = initiatorOrg && canManageOrganization(initiatorOrg.role)

    if (!isAllowed) {
      throw new ForbiddenError('Must be owner/admin to switch for other users')
    }
  } else {
    const selfOrg = await getUserOrganization(initiator.id, targetOrganizationId)

    if (!selfOrg) {
      throw new ForbiddenError('User does not belong to the target organization')
    }
  }
}
