import { gql } from 'graphql.macro';

export default gql`
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
          wcag_code
          screenshotUrl
          pages_affected
        }
        notices {
          message
          context
          selectors
          impact
          description
          help
          wcag_code
          screenshotUrl
          pages_affected
        }
        warnings {
          message
          context
          selectors
          impact
          description
          help
          wcag_code
          screenshotUrl
          pages_affected
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
          wcag_code
          screenshotUrl
          pages_affected
        }
        notices {
          code
          message
          context
          selectors
          description
          recommended_action
          wcag_code
          screenshotUrl
          pages_affected
        }
        warnings {
          code
          message
          context
          selectors
          description
          recommended_action
          wcag_code
          screenshotUrl
          pages_affected
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
          wcag_code
          screenshotUrl
          pages_affected
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
        pages_affected
      }
      issuesByFunction
      functionalityNames
      totalStats
    }
  }
`;
