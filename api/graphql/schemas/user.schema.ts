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

  extend type Query {
    profileUser: User!
    isEmailAlreadyRegistered(email: String!): Boolean! @rateLimit(limit: 5, duration: 60, message: "Too many email check attempts. Please try again later.")
  }

  extend type Mutation {
    register(email: String!, password: String!, name: String!, paymentMethodToken: String, planName: String, billingType: BillingType): Boolean!
      @rateLimit(limit: 3, duration: 3600, message: "Too many registration attempts. Please try again later.")

    login(email: String!, password: String!): Boolean!
      @rateLimit(limit: 7, duration: 900, message: "Too many login attempts. Please try again later.")

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
      @rateLimit(limit: 20, duration: 3600, message: "Too many profile update requests. Please try again later.")

    logout: Boolean!
  }
`;
