import { gql } from 'apollo-server-express';

export const OrganizationSchema = gql`
  type Organization {
    id: ID!
    name: String!
    subdomain: String!
    logo_url: String
    settings: JSON
    created_at: Date
    updated_at: Date
  }

  type OrganizationUser {
    id: ID!
    name: String!
    email: String!
    role: String!
    organization: Organization!
  }

  extend type Query {
    getUserOrganizations: [Organization!]!
    organizationExists(name: String!): Boolean
    getOrganizationUsers: [OrganizationUser!]!
  }

  extend type Mutation {
    addOrganization(
      name: String!
      logo_url: String
      settings: JSON
    ): Organization
    editOrganization(
      id: ID!
      name: String
      logo_url: String
      settings: JSON
    ): Organization
    removeOrganization(id: ID!): Boolean
  }
`;
