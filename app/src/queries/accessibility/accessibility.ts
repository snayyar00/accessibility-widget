import { gql } from 'graphql.macro';

export default gql`
  query GetUserSites($url: String!) {
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
        }
        warnings {
          code
          message
          context
          selectors
        }
      }
      score
      totalElements
    }
  }
`;