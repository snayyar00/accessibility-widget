import { gql } from 'apollo-server-express';

export const UserSchema = gql`
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
    organization_ids: [Int!]
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

    login(email: String!, password: String!): Boolean!

    registerSocialAccount(provider: SocialProviderType!, email: String!, name: String!, avatarUrl: String!, providerId: String!): Boolean!

    forgotPassword(email: String!): Boolean!

    changePassword(currentPassword: String!, newPassword: String!): Boolean!

    resetPassword(token: String!, password: String!, confirmPassword: String!): Boolean!

    verify(token: String!): Boolean!

    resendEmail(type: SendMailType!): Boolean!

    deleteAccount: Boolean!

    updateProfile(name: String, company: String, position: String): Boolean!

    updateProfileAvatar(file: Upload!): ChangeAvatarResponse!

    logout: Boolean!
  }
`;
