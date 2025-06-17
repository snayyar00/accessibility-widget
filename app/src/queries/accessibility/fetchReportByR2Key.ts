import { gql } from 'graphql.macro';

const FETCH_REPORT_BY_R2_KEY = gql`
  query fetchReportByR2Key($r2_key: String!) {
    fetchReportByR2Key(r2_key: $r2_key) {
      axe {
        errors {
          message
          context
          selectors
          impact
          description
          help
        }
        notices {
          message
          context
          selectors
          impact
          description
          help
        }
        warnings {
          message
          context
          selectors
          impact
          description
          help
        }
      }
      htmlcs {
        errors {
          code
          message
          context
          selectors
          description
          recommended_action
        }
        notices {
          code
          message
          context
          selectors
          description
          recommended_action
        }
        warnings {
          code
          message
          context
          selectors
          description
          recommended_action
        }
      }
      score
      totalElements
      siteImg

      ByFunctions {
            FunctionalityName
            Errors {
              code
              message
              context
              selectors
              description
              recommended_action
            } 
      }
    }
  }
`;

export default FETCH_REPORT_BY_R2_KEY;