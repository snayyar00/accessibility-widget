import { gql } from 'graphql.macro';

export default gql`
  query getAccessibilityReportByJobId($jobId: String!) {
    getAccessibilityReportByJobId(jobId: $jobId) {
      status
      result {
        reportData {
          score
          siteImg
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
          axe {
            errors { message context selectors impact description help wcag_code screenshotUrl }
            notices { message context selectors impact description help wcag_code screenshotUrl }
            warnings { message context selectors impact description help wcag_code screenshotUrl }
          }
          htmlcs {
            errors { code message context selectors description recommended_action wcag_code screenshotUrl }
            notices { code message context selectors description recommended_action wcag_code screenshotUrl }
            warnings { code message context selectors description recommended_action wcag_code screenshotUrl }
          }
          ByFunctions {
            FunctionalityName
            Errors { code message context selectors description recommended_action wcag_code screenshotUrl }
          }
          scriptCheckResult
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
        savedReport {
          key
          success
          report {
            id
            url
            allowed_sites_id
            r2_key
            created_at
            updated_at
            score
          }
        }
      }
      error
    }
  }
`; 