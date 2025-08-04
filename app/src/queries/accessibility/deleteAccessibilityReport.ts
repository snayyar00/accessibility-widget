import { gql } from 'graphql.macro';

const DELETE_ACCESSIBILITY_REPORT = gql`
  mutation deleteAccessibilityReport($r2Key: String!) {
    deleteAccessibilityReport(r2_key: $r2Key)
  }
`;

export default DELETE_ACCESSIBILITY_REPORT;