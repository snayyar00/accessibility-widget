import { gql } from 'graphql.macro';

export default gql`
  mutation DeleteSitesPlan($sitesPlanId: Int!) {
    deleteSitesPlan(sitesPlanId: $sitesPlanId)
  }
`;
