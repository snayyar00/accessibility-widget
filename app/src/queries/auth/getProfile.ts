import { gql } from 'graphql.macro';

export default gql`
  query GetProfile {
    profileUser {
      id
      email
      name
      isActive
      company
      position
      avatarUrl
      invitationToken
      hasOrganization
      
      currentOrganization {
        id
        name
        subdomain
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
        invited_by
        created_at
        updated_at
      }
    }
  }
`;
