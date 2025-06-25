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
        subdomain
      }
    }
  }
`;
