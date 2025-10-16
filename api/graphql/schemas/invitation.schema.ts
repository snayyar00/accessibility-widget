export const InvitationSchema = `#graphql
  enum InvitationType {
    organization
    workspace
  }

  enum InvitationStatus {
    pending
    accepted
    declined
    expired
  }

  type InvitationResponse {
    user_id: ID
    user_name: String
    user_email: String
    status: String
  }

  type VerifyInvitationResponse {
    id: ID
    workspace_name: String
    workspace_alias: String
    organization_name: String
    invited_by: String!
    email: String!
    status: String!
    role: String!
    valid_until: String!
    organization_id: ID
    workspace_id: ID
    token: String
    type: InvitationType!
    created_at: String
  }

  extend type Query {
    verifyInvitationToken(invitationToken: String!): VerifyInvitationResponse! @rateLimit(limit: 30, duration: 60, message: "Too many verification requests. Please try again later.")
  }

  extend type Mutation {
    inviteUser(
      type: InvitationType!
      email: String!
      role: String!
      workspaceId: ID
    ): InvitationResponse! @rateLimit(limit: 30, duration: 60, message: "Too many invitations. Please try again later.")
    
    joinInvitation(token: String!, type: String): Boolean! @rateLimit(limit: 5, duration: 60, message: "Too many join requests. Please try again later.")
  }
`
