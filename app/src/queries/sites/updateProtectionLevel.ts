import { gql } from 'graphql.macro';

export default gql`
  mutation UpdateSiteProtectionLevel($siteId: Int!, $protectionLevel: String!) {
    updateSiteProtectionLevel(siteId: $siteId, protectionLevel: $protectionLevel)
  }
`;
