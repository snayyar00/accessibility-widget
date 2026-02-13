import { combineResolvers } from 'graphql-resolvers'

import { normalizeEmail } from '../../helpers/string.helper'
import { changePasswordUser } from '../../services/authentication/change-password.service'
import { forgotPasswordUser } from '../../services/authentication/forgot-password.service'
import { loginOrRegisterWithGoogle } from '../../services/authentication/google-auth.service'
import { loginUser } from '../../services/authentication/login.service'
import { registerUser } from '../../services/authentication/register.service'
import { resetPasswordUser } from '../../services/authentication/reset-password.service'
import { resendEmailAction, verifyEmail } from '../../services/authentication/verify-email.service'
import { deleteUser } from '../../services/user/delete-user.service'
import { getLicenseOwnerInfo, updateLicenseOwnerInfo } from '../../services/user/license-owner.service'
import { getUserNotificationSettingsService, updateProfile, updateUserNotificationSettings } from '../../services/user/update-user.service'
import { changeCurrentOrganization } from '../../services/user/update-user.service'
import { isEmailAlreadyRegistered } from '../../services/user/user.service'
import { AuthenticationError } from '../../utils/graphql-errors.helper'
import { allowedOrganization, isAuthenticated } from './authorization.resolver'

type Register = {
  email: string
  password: string
  name: string
  referralCode?: string
}

type Login = {
  email: string
  password: string
}

type LoginWithGoogle = {
  idToken: string
}

type ForgotPassword = {
  email: string
}

type ResetPassword = {
  token: string
  password: string
  confirmPassword: string
}

type Verify = {
  token: string
}

const resolvers = {
  Query: {
    profileUser: combineResolvers(allowedOrganization, isAuthenticated, (_, __, { user }) => user),

    isEmailAlreadyRegistered: combineResolvers(allowedOrganization, async (_: unknown, { email }: { email: string }) => isEmailAlreadyRegistered(normalizeEmail(email))),

    getUserNotificationSettings: combineResolvers(allowedOrganization, isAuthenticated, async (_, __, { user }) => {
      return await getUserNotificationSettingsService(user.id, user.current_organization_id)
    }),

    getLicenseOwnerInfo: combineResolvers(allowedOrganization, isAuthenticated, async (_, __, { user }) => {
      return await getLicenseOwnerInfo(user.id)
    }),
  },

  User: {
    hasOrganization: (parent: { current_organization_id?: number }) => Boolean(parent.current_organization_id),
  },

  Mutation: {
    register: combineResolvers(allowedOrganization, async (_: unknown, { email, password, name, referralCode }: Register, { organization, allowedFrontendUrl }) => {
      const result = await registerUser(normalizeEmail(email), password, name, organization, allowedFrontendUrl, referralCode)

      return result
    }),

    login: combineResolvers(allowedOrganization, async (_: unknown, { email, password }: Login, { organization }) => {
      const result = await loginUser(normalizeEmail(email), password, organization)

      return result
    }),

    loginWithGoogle: combineResolvers(allowedOrganization, async (_: unknown, { idToken }: LoginWithGoogle, { organization }) => {
      const result = await loginOrRegisterWithGoogle(idToken, organization)

      if (result instanceof AuthenticationError) {
        throw result
      }
      return result
    }),

    logout: combineResolvers(allowedOrganization, () => {
      return true
    }),

    forgotPassword: combineResolvers(allowedOrganization, async (_: unknown, { email }: ForgotPassword, { organization }) => forgotPasswordUser(normalizeEmail(email), organization)),

    changePassword: combineResolvers(allowedOrganization, isAuthenticated, (_, { currentPassword, newPassword }, { user }) => changePasswordUser(user.id, currentPassword, newPassword)),

    resetPassword: combineResolvers(allowedOrganization, async (_: unknown, { token, password, confirmPassword }: ResetPassword) => resetPasswordUser(token, password, confirmPassword)),

    verify: combineResolvers(allowedOrganization, (_: unknown, { token }: Verify) => verifyEmail(token)),

    resendEmail: combineResolvers(allowedOrganization, isAuthenticated, (_, { type }, { user, organization }) => resendEmailAction(user, <'verify_email' | 'forgot_password'>normalizeEmail(type), organization)),

    deleteAccount: combineResolvers(allowedOrganization, isAuthenticated, async (_, __, { user }) => {
      const result = await deleteUser(user)

      return result
    }),

    updateProfile: combineResolvers(allowedOrganization, isAuthenticated, (_, { name, company, position }, { user }) => updateProfile(user.id, name, company, position)),

    updateNotificationSettings: combineResolvers(allowedOrganization, isAuthenticated, async (_, { monthly_report_flag, new_domain_flag, issue_reported_flag, onboarding_emails_flag, monitoring_alert_flag }, { user }) => {
      const result = await updateUserNotificationSettings(user.id, user.current_organization_id, {
        monthly_report_flag,
        new_domain_flag,
        issue_reported_flag,
        onboarding_emails_flag,
        monitoring_alert_flag,
      })

      return result.success
    }),

    updateLicenseOwnerInfo: combineResolvers(allowedOrganization, isAuthenticated, async (_, { name, license_owner_email, phone_number }, { user }) => {
      const result = await updateLicenseOwnerInfo(user.id, name, license_owner_email, phone_number)
      return result.success
    }),

    changeCurrentOrganization: combineResolvers(allowedOrganization, isAuthenticated, async (_, { organizationId, userId }, { user }) => {
      return await changeCurrentOrganization(user, organizationId, userId)
    }),
  },
}

export default resolvers
