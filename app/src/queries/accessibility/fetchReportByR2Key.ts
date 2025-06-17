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
      }
      issuesByFunction
      functionalityNames
      totalStats
    }
  }
`;

export default FETCH_REPORT_BY_R2_KEY;