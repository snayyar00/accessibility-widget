export const OrganizationSchema = `
  type Organization {
    id: ID!
    name: String!
    domain: String!
    logo_url: String
    settings: JSON
    created_at: Date
    updated_at: Date
  }

  type OrganizationUser {
    id: ID
    user_id: Int!
    organization_id: Int!
    role: String
    status: String
    created_at: Date
    updated_at: Date
  }

  extend type Query {
    getUserOrganizations: [Organization!]! @rateLimit(limit: 30, duration: 60, message: "Too many organization list requests. Please try again later.")
    getOrganizationUsers: [OrganizationUser!]! @rateLimit(limit: 30, duration: 60, message: "Too many organization users requests. Please try again later.")
  }

  extend type Mutation {
    addOrganization(name: String!, domain: String!, logo_url: String, settings: JSON): Organization @rateLimit(limit: 5, duration: 60, message: "Too many add attempts. Please try again later.")
    editOrganization(id: ID!, name: String, domain: String, logo_url: String, settings: JSON): Organization @rateLimit(limit: 10, duration: 60, message: "Too many edit attempts. Please try again later.")
    removeOrganization(id: ID!): Boolean @rateLimit(limit: 5, duration: 60, message: "Too many remove attempts. Please try again later.")
  }
`
