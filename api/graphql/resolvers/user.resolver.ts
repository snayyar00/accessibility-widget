import { combineResolvers } from 'graphql-resolvers';

import { Response } from 'express';
import { isAuthenticated } from './authorization.resolver';
import { registerUser } from '~/services/authentication/register.service';
import { loginUser } from '~/services/authentication/login.service';
import { verifyEmail, resendEmailAction } from '~/services/authentication/verify-email.service';
import { forgotPasswordUser } from '~/services/authentication/forgot-password.service';
import { resetPasswordUser } from '~/services/authentication/reset-password.service';
import { changePasswordUser } from '~/services/authentication/change-password.service';
import { deleteUser } from '~/services/user/delete-user.service';
import { updateProfile } from '~/services/user/update-user.service';
import { isEmailAlreadyRegistered } from '~/services/user/user.service';
import { normalizeEmail } from '~/helpers/string.helper';
import { clearCookie, COOKIE_NAME, setAuthenticationCookie } from '~/utils/cookie';
import { getOrganizationById } from '~/services/organization/organization.service';
import { getUserOrganization } from '~/services/organization/organization_users.service';

type Res = {
  res: Response;
};

type Register = {
  email: string;
  password: string;
  name: string;
};

type Login = {
  email: string;
  password: string;
};

type ForgotPassword = {
  email: string;
};

type ResetPassword = {
  token: string;
  password: string;
  confirmPassword: string;
};

type Verify = {
  token: string;
};

const resolvers = {
  Query: {
    profileUser: combineResolvers(isAuthenticated, (_, __, { user }) => user),
    isEmailAlreadyRegistered: async (_: unknown, { email }: { email: string }) => isEmailAlreadyRegistered(normalizeEmail(email)),
  },
  User: {
    currentOrganization: async (parent: { current_organization_id?: number; id?: number }) => {
      if (!parent.current_organization_id || !parent.id) return null;

      const org = await getOrganizationById(parent.current_organization_id, parent);

      return org || null;
    },

    currentOrganizationUser: async (parent: { id?: number; current_organization_id?: number }) => {
      if (!parent.id || !parent.current_organization_id) return null;

      const orgUser = await getUserOrganization(parent.id, parent.current_organization_id);

      return orgUser || null;
    },

    hasOrganization: (parent: { current_organization_id?: number }) => Boolean(parent.current_organization_id),
  },
  Mutation: {
    register: async (_: unknown, { email, password, name }: Register, { res }: Res) => {
      const result = await registerUser(normalizeEmail(email), password, name);

      if (result && result.token) {
        setAuthenticationCookie(res, result.token);
        return true;
      }

      return result;
    },

    login: async (_: unknown, { email, password }: Login, { res }: Res) => {
      const result = await loginUser(normalizeEmail(email), password, res);

      if (result && result.token) {
        setAuthenticationCookie(res, result.token);
        return true;
      }

      return result;
    },

    logout: (_: unknown, __: unknown, { res }: Res) => {
      clearCookie(res, COOKIE_NAME.TOKEN);
      return true;
    },

    forgotPassword: async (_: unknown, { email }: ForgotPassword) => forgotPasswordUser(normalizeEmail(email)),

    changePassword: combineResolvers(isAuthenticated, (_, { currentPassword, newPassword }, { user }) => changePasswordUser(user.id, currentPassword, newPassword)),

    resetPassword: async (_: unknown, { token, password, confirmPassword }: ResetPassword) => resetPasswordUser(token, password, confirmPassword),

    verify: (_: unknown, { token }: Verify) => verifyEmail(token),

    resendEmail: combineResolvers(isAuthenticated, (_, { type }, { user }) => resendEmailAction(user, <'verify_email' | 'forgot_password'>normalizeEmail(type))),

    deleteAccount: combineResolvers(isAuthenticated, async (_, __, { user, res }) => {
      const result = await deleteUser(user);

      if (result === true) {
        clearCookie(res, COOKIE_NAME.TOKEN);
      }

      return result;
    }),

    updateProfile: combineResolvers(isAuthenticated, (_, { name, company, position }, { user }) => updateProfile(user.id, name, company, position)),
  },
};

export default resolvers;
