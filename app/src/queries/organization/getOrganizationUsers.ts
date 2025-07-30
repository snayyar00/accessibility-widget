import { gql } from 'graphql.macro';

export default gql`
  query GetOrganizationUsers {
    getOrganizationUsers {
      id
      user_id
      organization_id
      role
      status
      created_at
      updated_at
    }
  }
`;
