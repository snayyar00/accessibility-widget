import { gql } from '@apollo/client';

export const ANALYZE_DOMAIN = gql`
  query AnalyzeDomain($domain: String!) {
    analyzeDomain(domain: $domain) {
      url
      status
      insights
      error
      timestamp
    }
  }
`;

export default ANALYZE_DOMAIN;
