import { gql } from 'graphql.macro';

const DELETE_ACCESSIBILITY_REPORT = gql`
  mutation deleteAccessibilityReport($r2_key: String!) {
    deleteAccessibilityReport(r2_key: $r2_key)
  }
`;

export default DELETE_ACCESSIBILITY_REPORT;