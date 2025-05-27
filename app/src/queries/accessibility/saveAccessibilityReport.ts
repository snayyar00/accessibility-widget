import { gql } from 'graphql.macro';

const SAVE_ACCESSIBILITY_REPORT = gql`
  mutation SaveAccessibilityReport(
    $report: JSON!
    $url: String!
    $allowed_sites_id: Int
    $key: String
  ) {
    saveAccessibilityReport(
      report: $report
      url: $url
      allowed_sites_id: $allowed_sites_id
      key: $key
    ) {
      success
      key
      report {
        id
        url
        allowed_sites_id
        r2_key
        created_at
        updated_at
      }
    }
  }
`;

export default SAVE_ACCESSIBILITY_REPORT;