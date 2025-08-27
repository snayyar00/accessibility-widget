export const OrganizationSchema = `#graphql
  enum OrganizationUserRole {
    owner
    admin
    member
  }

  enum OrganizationUserStatus {
    active
    invited
    pending
    removed
  }

  type Organization {
    id: ID!
    name: String!
    domain: String!
    favicon: String
    logo_url: String
    settings: JSON
    created_at: Date
    updated_at: Date
  }

  type OrganizationUser {
    id: ID
    user_id: Int!
    organization_id: Int!
    current_workspace_id: Int
    role: OrganizationUserRole
    status: OrganizationUserStatus
    created_at: Date
    updated_at: Date
    user: User!
    organizations: [Organization!]!
    currentOrganization: Organization
    currentWorkspace: Workspace
    workspaces: [Workspace!]!
    hasWorkspace: Boolean!
  }

  extend type Query {
    getUserOrganizations: [Organization!]! @rateLimit(limit: 30, duration: 60, message: "Too many organization list requests. Please try again later.")
    getOrganizationUsers: [OrganizationUser!]! @rateLimit(limit: 30, duration: 60, message: "Too many organization users requests. Please try again later.")
    getOrganizationByDomain: Organization @rateLimit(limit: 60, duration: 60, message: "Too many organization by domain requests. Please try again later.")
    getOrganizationWorkspaces: [Workspace!]! @rateLimit(limit: 30, duration: 60, message: "Too many organization workspaces requests. Please try again later.")
  }

  extend type Mutation {
    addOrganization(name: String!, domain: String!, logo_url: String, settings: JSON): Organization @rateLimit(limit: 5, duration: 60, message: "Too many add attempts. Please try again later.")
    editOrganization(id: ID!, name: String, domain: String, logo_url: String, settings: JSON): Organization @rateLimit(limit: 10, duration: 60, message: "Too many edit attempts. Please try again later.")
    removeOrganization(id: ID!): Boolean @rateLimit(limit: 5, duration: 60, message: "Too many remove attempts. Please try again later.")
    removeUserFromOrganization(userId: Int!): Boolean @rateLimit(limit: 30, duration: 60, message: "Too many remove user attempts. Please try again later.")
    changeOrganizationUserRole(userId: Int!, role: OrganizationUserRole!): Boolean @rateLimit(limit: 20, duration: 60, message: "Too many role change attempts. Please try again later.")
  }
`
