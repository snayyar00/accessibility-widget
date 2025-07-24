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
      currentOrganization {
        id
        name
        domain
        logo_url
        settings
        created_at
        updated_at
      }
    }
  }
`;
