import { gql } from 'apollo-server-express';

export const OrganizationUserSchema = gql`
  type OrganizationUser {
    id: ID!
    user_id: Int!
    organization_id: Int!
    role: String
    status: String
    invited_by: Int
    created_at: Date
    updated_at: Date
  }
`;
