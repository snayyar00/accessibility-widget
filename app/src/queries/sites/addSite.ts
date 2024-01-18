import { gql } from 'graphql.macro';

export default gql`
  mutation addSite($url: String!) {
    addSite(url:$url)
  }
`;