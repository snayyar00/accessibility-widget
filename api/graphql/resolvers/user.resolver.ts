import { combineResolvers } from 'graphql-resolvers'

import { GraphQLContext } from '../../graphql/types'
import { normalizeEmail } from '../../helpers/string.helper'
import { changePasswordUser } from '../../services/authentication/change-password.service'
import { forgotPasswordUser } from '../../services/authentication/forgot-password.service'
import { loginUser } from '../../services/authentication/login.service'
import { registerUser } from '../../services/authentication/register.service'
import { resetPasswordUser } from '../../services/authentication/reset-password.service'
import { resendEmailAction, verifyEmail } from '../../services/authentication/verify-email.service'
import { getOrganizationById } from '../../services/organization/organization.service'
import { getUserOrganization } from '../../services/organization/organization_users.service'
import { deleteUser } from '../../services/user/delete-user.service'
import { getUserNotificationSettingsService, updateProfile, updateUserNotificationSettings } from '../../services/user/update-user.service'
import { isEmailAlreadyRegistered } from '../../services/user/user.service'
import { allowedOrganization, isAuthenticated } from './authorization.resolver'

type Register = {
  email: string
  password: string
  name: string
}

type Login = {
  email: string
  password: string
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
      return await getUserNotificationSettingsService(user.id)
    }),
  },
  User: {
    currentOrganization: async (parent: { current_organization_id?: number; id?: number }) => {
      if (!parent.current_organization_id || !parent.id) return null

      const org = await getOrganizationById(parent.current_organization_id, parent)

      return org || null
    },

    currentOrganizationUser: async (parent: { id?: number; current_organization_id?: number }) => {
      if (!parent.id || !parent.current_organization_id) return null

      const orgUser = await getUserOrganization(parent.id, parent.current_organization_id)

      return orgUser || null
    },

    hasOrganization: (parent: { current_organization_id?: number }) => Boolean(parent.current_organization_id),
  },
  Mutation: {
    register: combineResolvers(allowedOrganization, async (_: unknown, { email, password, name }: Register, { organization }: GraphQLContext) => {
      const result = await registerUser(normalizeEmail(email), password, name, organization)

      return result
    }),

    login: combineResolvers(allowedOrganization, async (_: unknown, { email, password }: Login, { organization }: GraphQLContext) => {
      const result = await loginUser(normalizeEmail(email), password, organization)

      return result
    }),

    logout: combineResolvers(allowedOrganization, () => {
      return true
    }),

    forgotPassword: combineResolvers(allowedOrganization, async (_: unknown, { email }: ForgotPassword, { organization }: GraphQLContext) => forgotPasswordUser(normalizeEmail(email), organization)),

    changePassword: combineResolvers(allowedOrganization, isAuthenticated, (_, { currentPassword, newPassword }, { user }) => changePasswordUser(user.id, currentPassword, newPassword)),

    resetPassword: combineResolvers(allowedOrganization, async (_: unknown, { token, password, confirmPassword }: ResetPassword) => resetPasswordUser(token, password, confirmPassword)),

    verify: combineResolvers(allowedOrganization, (_: unknown, { token }: Verify) => verifyEmail(token)),

    resendEmail: combineResolvers(allowedOrganization, isAuthenticated, (_, { type }, { user, organization }) => resendEmailAction(user, <'verify_email' | 'forgot_password'>normalizeEmail(type), organization)),

    deleteAccount: combineResolvers(allowedOrganization, isAuthenticated, async (_, __, { user }) => {
      const result = await deleteUser(user)

      return result
    }),

    updateProfile: combineResolvers(allowedOrganization, isAuthenticated, (_, { name, company, position }, { user }) => updateProfile(user.id, name, company, position)),

    updateNotificationSettings: combineResolvers(allowedOrganization, isAuthenticated, async (_, { monthly_report_flag, new_domain_flag, issue_reported_flag }, { user }) => {
      const result = await updateUserNotificationSettings(user.id, {
        monthly_report_flag,
        new_domain_flag,
        issue_reported_flag,
      })

      return result.success
    }),
  },
}

export default resolvers
