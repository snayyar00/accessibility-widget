import { gql } from 'graphql.macro';

export default gql`
  query GetAvailableSitesForWorkspace {
    getAvailableSitesForWorkspace {
      url
      id
      expiredAt
      trial
      is_owner
      workspaces {
        id
        name
      }
      user_email
    }
  }
`;
