export const OrganizationSchema = `#graphql
  enum OrganizationUserRole {
    owner
    admin
    member
  }

  enum OrganizationUserStatus {
    active
    pending
    inactive
    decline
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
    role: OrganizationUserRole
    status: OrganizationUserStatus
    created_at: Date
    updated_at: Date
    invitationId: Int
    user: User!
    organizations: [Organization!]!
    currentOrganization: Organization
    workspaces: [Workspace!]!
    hasWorkspace: Boolean!
    hasAgencyAccountId: Boolean!
  }

  type AgencyProgramConnectionResponse {
    onboardingUrl: String!
    success: Boolean!
  }

  type AgencyProgramDisconnectionResponse {
    success: Boolean!
    message: String
  }

  extend type Query {
    getUserOrganizations: [Organization!]! @rateLimit(limit: 30, duration: 60, message: "Too many organization list requests. Please try again later.")
    getOrganizationUsers: [OrganizationUser!]! @rateLimit(limit: 30, duration: 60, message: "Too many organization users requests. Please try again later.")
    getOrganizationByDomain: Organization @rateLimit(limit: 60, duration: 60, message: "Too many organization by domain requests. Please try again later.")
    getOrganizationWorkspaces: [Workspace!]! @rateLimit(limit: 30, duration: 60, message: "Too many organization workspaces requests. Please try again later.")
  }

  extend type Mutation {
    addOrganization(name: String!, domain: String!, logo_url: String, settings: JSON): Organization @rateLimit(limit: 5, duration: 60, message: "Too many add attempts. Please try again later.")
    editOrganization(id: ID!, name: String, domain: String, logo_url: String, favicon: String, settings: JSON): Organization @rateLimit(limit: 10, duration: 60, message: "Too many edit attempts. Please try again later.")
    uploadOrganizationLogo(organizationId: ID!, logo: Upload!): Organization @rateLimit(limit: 10, duration: 60, message: "Too many upload attempts. Please try again later.")
    uploadOrganizationFavicon(organizationId: ID!, favicon: Upload!): Organization @rateLimit(limit: 10, duration: 60, message: "Too many upload attempts. Please try again later.")
    removeOrganization(id: ID!): Boolean @rateLimit(limit: 5, duration: 60, message: "Too many remove attempts. Please try again later.")
    removeUserFromOrganization(userId: Int!): Boolean @rateLimit(limit: 30, duration: 60, message: "Too many remove user attempts. Please try again later.")
    changeOrganizationUserRole(userId: Int!, role: OrganizationUserRole!): Boolean @rateLimit(limit: 20, duration: 60, message: "Too many role change attempts. Please try again later.")
    connectToAgencyProgram(successUrl: String!): AgencyProgramConnectionResponse! @rateLimit(limit: 5, duration: 300, message: "Too many agency connection attempts. Please try again later.")
    disconnectFromAgencyProgram: AgencyProgramDisconnectionResponse! @rateLimit(limit: 5, duration: 300, message: "Too many agency disconnection attempts. Please try again later.")
    updateAgencyAccount(agencyAccountId: String!): Boolean! @rateLimit(limit: 5, duration: 300, message: "Too many agency update attempts. Please try again later.")
  }
`
