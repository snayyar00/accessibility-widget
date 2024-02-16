import { gql } from 'graphql.macro';

export default gql`
  query GetUniqueToken($url: String!) {
    getVisitorTokenByWebsite(url: $url)
  }
`;