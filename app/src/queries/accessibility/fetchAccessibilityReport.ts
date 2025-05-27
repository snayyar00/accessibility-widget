import { gql } from 'graphql.macro';

const FETCH_ACCESSIBILITY_REPORT_FROM_R2 = gql`
  query FetchAccessibilityReportFromR2($url: String!, $created_at: String, $updated_at: String) {
    fetchAccessibilityReportFromR2(url: $url, created_at: $created_at, updated_at: $updated_at) {
      axe {
        errors { message context selectors impact description help }
        notices { message context selectors impact description help }
        warnings { message context selectors impact description help }
      }
      htmlcs {
        errors { code message context selectors description recommended_action }
        notices { code message context selectors description recommended_action }
        warnings { code message context selectors description recommended_action }
      }
      score
      totalElements
      siteImg
      ByFunctions {
        FunctionalityName
        Errors { code message context selectors description recommended_action }
      }
    }
  }
`;

export default FETCH_ACCESSIBILITY_REPORT_FROM_R2;