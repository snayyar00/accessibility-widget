import { gql } from '@apollo/client';

const addSiteQuery = gql`
  mutation AddSite($url: String!) {
    addSite(url: $url)
  }
`;

export default addSiteQuery; 