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

export default FETCH_REPORT_BY_R2_KEY;