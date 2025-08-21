export const WorkspaceSchema = `#graphql
#   enum WorkspaceUserRole {
#     owner
#     admin
#     member
#   }

#   enum WorkspaceUserStatus {
#     active
#     pending
#     inactive
#     decline
#   }

#   enum WorkspaceInvitationStatus {
#     pending
#     accepted
#     declined
#     expired
#   }

#   enum JoinWorkspaceType {
#     accept
#     decline
#   }

  type Workspace {
    id: ID!
    name: String!
    alias: String!
    organization_id: ID!
    # createdAt: String!
    # updatedAt: String!
    # deletedAt: String
    # createdBy: ID!
    # members: [WorkspaceMember!]!
  }

#   type WorkspaceMember {
#     id: ID!
#     userId: ID!
#     userName: String
#     email: String!
#     role: WorkspaceUserRole!
#     status: WorkspaceUserStatus!
#     createdAt: String!
#     updatedAt: String!
#     deletedAt: String
#     invitationToken: String
#   }

#   type WorkspaceInvitation {
#     id: ID!
#     email: String!
#     workspaceId: ID!
#     organizationId: ID!
#     token: String!
#     status: WorkspaceInvitationStatus!
#     role: WorkspaceUserRole!
#     validUntil: String!
#     invitedBy: ID!
#     createdAt: String!
#   }

#   type VerifyWorkspaceInvitationResponse {
#     workspaceName: String!
#     invitedBy: String!
#     status: WorkspaceInvitationStatus!
#     role: WorkspaceUserRole!
#   }

  extend type Query {
    getUserWorkspaces: [Workspace!]! @rateLimit(limit: 30, duration: 60, message: "Too many workspaces list requests. Please try again later.")
    # getWorkspaceDetail(alias: String!): [WorkspaceMember!]!
    # verifyWorkspaceInvitationToken(invitationToken: String!): VerifyWorkspaceInvitationResponse!
  }

  extend type Mutation {
    createWorkspace(name: String!): Workspace! @rateLimit(limit: 5, duration: 60, message: "Too many add workspaces. Please try again later.")
    deleteWorkspace(id: ID!): Boolean! @rateLimit(limit: 5, duration: 60, message: "Too many delete workspaces. Please try again later.")
    updateWorkspace(id: ID!, name: String): Workspace! @rateLimit(limit: 30, duration: 60, message: "Too many update workspaces. Please try again later.")
    # inviteWorkspaceMember(email: String!, alias: String!, role: WorkspaceUserRole!): WorkspaceInvitation!
    # joinWorkspace(type: JoinWorkspaceType!, token: String!): Boolean!
  }
`
