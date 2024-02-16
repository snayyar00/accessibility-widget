import { gql } from 'graphql.macro';

export default gql`
  mutation updateSite($url: String!, $siteId: Int!) {
    changeURL(newURL:$url, siteId: $siteId)
  }
`;