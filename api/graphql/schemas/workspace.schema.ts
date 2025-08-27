export const WorkspaceSchema = `#graphql
  enum WorkspaceUserRole {
    owner
    admin
    member
  }

  enum WorkspaceUserStatus {
    active
    pending
    inactive
    decline
  }

  enum WorkspaceInvitationStatus {
    pending
    accepted
    declined
    expired
  }

  enum JoinWorkspaceType {
    accept
    decline
  }

  type Workspace {
    id: ID!
    name: String!
    alias: String!
    organization_id: ID!
    members: [WorkspaceUser!]!
    domains: [AllowedSite!]!
  }

  type AllowedSite {
    id: ID!
    url: String!
  }

  type WorkspaceUser {
    id: ID!
    user_id: Int!
    workspace_id: Int!
    role: String!
    status: String!
    created_at: Date
    updated_at: Date
    user: User!
  }

  type WorkspaceInvitation {
    user_id: ID
    user_name: String
    user_email: String
    status: WorkspaceUserStatus
  }

  type VerifyWorkspaceInvitationResponse {
    workspace_name: String!
    invited_by: String!
    status: WorkspaceInvitationStatus!
    role: WorkspaceUserRole!
    valid_until: String!
  }

  type WorkspaceInvitationDetails {
    workspace_name: String!
    invited_by: String!
    email: String!
    status: WorkspaceInvitationStatus!
    role: WorkspaceUserRole!
    valid_until: String!
    organization_id: ID
    workspace_id: ID
    token: String
  }

  extend type Query {
    getUserWorkspaces: [Workspace!]! @rateLimit(limit: 30, duration: 60, message: "Too many workspaces list requests. Please try again later.")
    getWorkspaceByAlias(alias: String!): Workspace @rateLimit(limit: 30, duration: 60, message: "Too many workspace requests. Please try again later.")
    getWorkspaceMembersByAlias(alias: String!): [WorkspaceUser!]! @rateLimit(limit: 30, duration: 60, message: "Too many workspace members requests. Please try again later.")
    getWorkspaceInvitationsByAlias(alias: String!): [WorkspaceInvitationDetails!]! @rateLimit(limit: 30, duration: 60, message: "Too many workspace invitations requests. Please try again later.")
    verifyWorkspaceInvitationToken(invitationToken: String!): VerifyWorkspaceInvitationResponse! @rateLimit(limit: 30, duration: 60, message: "Too many verifyWorkspaceInvitationToken requests. Please try again later.")
  }

  extend type Mutation {
    createWorkspace(name: String!): Workspace! @rateLimit(limit: 5, duration: 60, message: "Too many add workspace. Please try again later.")
    deleteWorkspace(id: ID!): Boolean! @rateLimit(limit: 5, duration: 60, message: "Too many delete workspace. Please try again later.")
    updateWorkspace(id: ID!, name: String, allowedSiteIds: [ID!]): Workspace! @rateLimit(limit: 30, duration: 60, message: "Too many update workspace. Please try again later.")
    inviteWorkspaceMember(email: String!, alias: String!, role: WorkspaceUserRole!): WorkspaceInvitation! @rateLimit(limit: 30, duration: 60, message: "Too many invitations. Please try again later.")
    changeWorkspaceMemberRole(alias: String!, userId: ID!, role: WorkspaceUserRole!): Boolean! @rateLimit(limit: 30, duration: 60, message: "Too many role change requests. Please try again later.")
    joinWorkspace(type: JoinWorkspaceType!, token: String!): Boolean! @rateLimit(limit: 5, duration: 60, message: "Too many join workspace. Please try again later.")
  }
`
