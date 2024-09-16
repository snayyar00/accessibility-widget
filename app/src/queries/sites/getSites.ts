import { gql } from 'graphql.macro';

export default gql`
  query GetUserSites {
    getUserSites{
      url,
      id,
      expiredAt,
      trial
    }
  }
`;
