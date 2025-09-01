import { gql } from 'graphql.macro';

export default gql`
  query startAccessibilityReportJob($url: String!, $use_cache: Boolean) {
    startAccessibilityReportJob(url: $url, use_cache: $use_cache) {
      jobId
    }
  }
`;
