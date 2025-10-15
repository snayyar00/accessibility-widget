export const InvitationSchema = `#graphql
  enum InvitationType {
    organization
    workspace
  }

  type InvitationResponse {
    user_id: ID
    user_name: String
    user_email: String
    status: String
  }

  extend type Mutation {
    inviteUser(
      type: InvitationType!
      email: String!
      role: String!
      workspaceId: ID
    ): InvitationResponse! @rateLimit(limit: 30, duration: 60, message: "Too many invitations. Please try again later.")
  }
`
