import { gql } from 'graphql.macro';

export default gql`
  mutation ToggleSiteMonitoring($siteId: Int!, $enabled: Boolean!) {
    toggleSiteMonitoring(siteId: $siteId, enabled: $enabled)
  }
`;