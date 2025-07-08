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
          helpUrl
          runner
          wcagLevel
        }
        notices {
          message
          context
          selectors
          impact
          description
          help
          screenshotUrl
          helpUrl
          runner
          wcagLevel
        }
        warnings {
          message
          context
          selectors
          impact
          description
          help
          screenshotUrl
          helpUrl
          runner
          wcagLevel
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
          helpUrl
          runner
          impact
          wcagLevel
        }
        notices {
          code
          message
          context
          selectors
          description
          recommended_action
          screenshotUrl
          helpUrl
          runner
          impact
          wcagLevel
        }
        warnings {
          code
          message
          context
          selectors
          description
          recommended_action
          screenshotUrl
          helpUrl
          runner
          impact
          wcagLevel
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
              helpUrl
              runner
              impact
              wcagLevel
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
      webability_metadata {
        job_id
        scan_duration
        scan_timestamp
        browser_info {
          userAgent
          viewport
          orientation
        }
        accessibility_standards {
          wcag_version
          compliance_level
          tested_rules
          passed_rules
          failed_rules
          incomplete_rules
          inapplicable_rules
        }
        issue_breakdown {
          by_type {
            errors
            warnings
            notices
            total
          }
          by_severity {
            critical
            serious
            moderate
            minor
            unknown
          }
          by_category {
            perceivable
            operable
            understandable
            robust
            best_practice
            other
          }
        }
        screenshots
        violation_screenshots
      }
    }
  }
`;

export default FETCH_REPORT_BY_R2_KEY;