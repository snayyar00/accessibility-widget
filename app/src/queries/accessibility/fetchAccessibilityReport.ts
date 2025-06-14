import { gql } from 'graphql.macro';

const FETCH_ACCESSIBILITY_REPORT_KEYS = gql`
  query fetchAccessibilityReportFromR2($url: String!, $created_at: String, $updated_at: String) {
    fetchAccessibilityReportFromR2(url: $url, created_at: $created_at, updated_at: $updated_at) {
      url
      r2_key
      created_at
      score
    }
  }
`;

export default FETCH_ACCESSIBILITY_REPORT_KEYS;