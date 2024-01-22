import { gql } from 'graphql.macro';

export default gql`
  query GetUserSites($url: String!) {
    getAccessibilityReport(url: $url, reportType: 3) {
    status {
      success
      httpstatuscode
    }
    accessibilityScore{
      score,
      totalElements
    }
    categories
  }
  }
`;