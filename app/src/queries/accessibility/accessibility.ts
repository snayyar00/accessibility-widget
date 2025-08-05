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
          screenshotUrl
        }
        notices {
          message
          context
          selectors
          impact
          description
          help
          screenshotUrl
        }
        warnings {
          message
          context
          selectors
          impact
          description
          help
          screenshotUrl
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
          screenshotUrl
        }
        notices {
          code
          message
          context
          selectors
          description
          recommended_action
          screenshotUrl
        }
        warnings {
          code
          message
          context
          selectors
          description
          recommended_action
          screenshotUrl
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
              screenshotUrl
            } 
      }
      scriptCheckResult
      techStack {
        technologies
        categorizedTechnologies {
          category
          technologies
        }
        confidence
        accessibilityContext {
          platform
          platform_type
          has_cms
          has_ecommerce
          has_framework
          is_spa
        }
        analyzedUrl
        analyzedAt
        source
      }
      issues {
        functionality
        impact
        message
        context
        selectors
        description
        recommended_action
        screenshotUrl
      }
      issuesByFunction
      functionalityNames
      totalStats
    }
  }
`;


// ByFunctions {
//   Human functionalities
//     {
//       Functionality Name
//       errors {
//         code
//         message
//         context
//         selectors
//         description
//         recommended_action
//       } 
//     }
// }
