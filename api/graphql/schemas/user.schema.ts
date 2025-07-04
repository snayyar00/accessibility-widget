import { gql } from 'apollo-server-express';

export const UserSchema = gql`
  directive @rateLimit(
    limit: Int! = 5
    duration: Int! = 60
    message: String = "Rate limit exceeded"
  ) on FIELD_DEFINITION

  enum BillingType {
    MONTHLY
    YEARLY
  }

  enum SendMailType {
    VERIFY_EMAIL
    FORGOT_PASSWORD
  }

  enum SocialProviderType {
    GITHUB
    FACEBOOK
    GOOGLE
  }

  type User {
    id: ID!
    email: String!
    name: String!
    isActive: Boolean!
    position: String
    company: String
    avatarUrl: String
    invitationToken: String
  }

  type UserSocial {
    providerId: String!
    provider: String!
    avatarUrl: String
    name: String!
    email: String
  }

  type ResponseUserSocial {
    token: String
    user: UserSocial
  }

  type ChangeAvatarResponse {
    url: String
  }

  extend type Query {
    profileUser: User!
    loginBySocial(provider: SocialProviderType!, code: String!): ResponseUserSocial!
    isEmailAlreadyRegistered(email: String!): Boolean!
  }

  extend type Mutation {
    register(email: String!, password: String!, name: String!, paymentMethodToken: String, planName: String, billingType: BillingType): Boolean!
      @rateLimit(limit: 3, duration: 3600, message: "Too many registration attempts. Please try again later.")

    login(email: String!, password: String!): Boolean!
      @rateLimit(limit: 7, duration: 900, message: "Too many login attempts. Please try again later.")

    registerSocialAccount(provider: SocialProviderType!, email: String!, name: String!, avatarUrl: String!, providerId: String!): Boolean!
      @rateLimit(limit: 3, duration: 3600, message: "Too many social registration attempts. Please try again later.")

    forgotPassword(email: String!): Boolean!
      @rateLimit(limit: 3, duration: 3600, message: "Too many password reset requests. Please try again later.")

    changePassword(currentPassword: String!, newPassword: String!): Boolean!
      @rateLimit(limit: 5, duration: 3600, message: "Too many password change attempts. Please try again later.")

    resetPassword(token: String!, password: String!, confirmPassword: String!): Boolean!
      @rateLimit(limit: 5, duration: 3600, message: "Too many password reset attempts. Please try again later.")

    verify(token: String!): Boolean!
      @rateLimit(limit: 10, duration: 3600, message: "Too many verification attempts. Please try again later.")

    resendEmail(type: SendMailType!): Boolean!
      @rateLimit(limit: 3, duration: 3600, message: "Too many email resend requests. Please try again later.")

    deleteAccount: Boolean!
      @rateLimit(limit: 3, duration: 3600, message: "Too many account deletion requests. Please try again later.")

    updateProfile(name: String, company: String, position: String): Boolean!
      @rateLimit(limit: 3, duration: 3600, message: "Too many profile update requests. Please try again later.")

    updateProfileAvatar(file: Upload!): ChangeAvatarResponse!
      @rateLimit(limit: 3, duration: 3600, message: "Too many profile avatar update requests. Please try again later.")

    logout: Boolean!
  }
`;
