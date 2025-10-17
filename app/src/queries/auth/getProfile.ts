import { gql } from 'graphql.macro';

export default gql`
  query GetProfile {
    profileUser {
      id
      email
      name
      isActive
      is_super_admin
      company
      position
      avatarUrl
      invitationToken
      current_organization_id
      currentOrganization {
        id
        name
        domain
        logo_url
        settings
        created_at
        updated_at
      }
      currentOrganizationUser {
        id
        user_id
        organization_id
        role
        status
        created_at
        updated_at
      }
    }
  }
`;
