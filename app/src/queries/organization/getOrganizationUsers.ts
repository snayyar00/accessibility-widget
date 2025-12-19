import { gql } from 'graphql.macro';

export default gql`
  query GetOrganizationUsers($search: String) {
    getOrganizationUsers(search: $search) {
      id
      user_id
      organization_id
      role
      status
      updated_at
      invitationId
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
      workspaces {
        name
        alias
      }
    }
  }
`;
