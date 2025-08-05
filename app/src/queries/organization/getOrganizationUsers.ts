import { gql } from 'graphql.macro';

export default gql`
  query GetOrganizationUsers {
    getOrganizationUsers {
      id
      user_id
      organization_id
      role
      status
      updated_at
      user {
        id
        name
        email
        current_organization_id
        isActive
      }
      organizations {
        id
        name
      }
      currentOrganization {
        id
        name
      }
    }
  }
`;
