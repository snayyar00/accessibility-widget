import { gql } from 'graphql.macro';

export default gql`
  query startAccessibilityReportJob(
    $url: String!
    $use_cache: Boolean
    $full_site_scan: Boolean
  ) {
    startAccessibilityReportJob(
      url: $url
      use_cache: $use_cache
      full_site_scan: $full_site_scan
    ) {
      jobId
    }
  }
`;
