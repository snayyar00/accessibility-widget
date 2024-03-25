import { gql } from 'graphql.macro';

export default gql`
  query getAccessibilityReport($url: String!) {
    getAccessibilityReport(url: $url) {
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
    }
  }
`;
