import { gql } from 'graphql.macro';

export default gql`
  mutation UpdateSitesPlan($sitesPlanId: Int!, $planName: String!, $billingType: BillingType!) {
    updateSitesPlan(sitesPlanId: $sitesPlanId, planName: $planName, billingType: $billingType)
  }
`;
