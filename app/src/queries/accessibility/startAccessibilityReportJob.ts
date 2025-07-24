import { gql } from 'graphql.macro';

export default gql`
  query startAccessibilityReportJob($url: String!) {
    startAccessibilityReportJob(url: $url) {
      jobId
    }
  }
`; 