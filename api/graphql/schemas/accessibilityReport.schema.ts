import { gql } from 'apollo-server-express';

export const AccessibilitySchema = gql`
  type TemplateInfo {
    is_template_issue: Boolean
    occurrence_count: Int
    fix_scope: String
  }

  type ProcessingMetadata {
    runners: [String]
    merged_from: Int
    batch_id: String
    gpt_success: Boolean
    runner_agreement: Boolean
  }

  type TemplatePattern {
    pattern_id: String
    issue_type: String
    selector_pattern: String
    occurrence_count: Int
    affected_elements: [String]
    fix_scope: String
    confidence: Int
    template_recommendation: String
    estimated_fix_effort: String
    fix_priority_score: Int
  }

  type TemplateAnalysis {
    patterns_detected: [TemplatePattern]
    total_template_issues: Int
    potential_cost_savings: Int
    fix_priority_score: Int
  }

  type ConfidenceDistribution {
    critical_120_plus: Int
    high_90_119: Int
    medium_60_89: Int
    low_less_than_60: Int
  }

  type RunnerBreakdown {
    axe_only: Int
    htmlcs_only: Int
    both_runners: Int
  }

  type PreprocessingStats {
    raw_issues_count: Int
    processed_issues_count: Int
    batches_created: Int
    processing_time_ms: Int
    template_patterns_detected: Int
    template_issues_count: Int
    potential_template_savings: Int
    avg_confidence_score: Int
    confidence_distribution: ConfidenceDistribution
    runner_breakdown: RunnerBreakdown
    issues_filtered: Int
    filtering_efficiency: Int
  }

  type axeOutput {
    message: String
    context: [String]
    selectors: [String]
    impact: String
    description: String
    help: String
    confidence_score: Int
    template_info: TemplateInfo
    processing_metadata: ProcessingMetadata
  }

  type htmlCsOutput {
    code: String
    message: String
    context: [String]
    selectors: [String]
    description: String
    recommended_action: String
    confidence_score: Int
    template_info: TemplateInfo
    processing_metadata: ProcessingMetadata
  }

  type axeResult {
    errors: [axeOutput]
    notices: [axeOutput]
    warnings: [axeOutput]
  }

  type htmlCsResult {
    errors: [htmlCsOutput]
    notices: [htmlCsOutput]
    warnings: [htmlCsOutput]
  }

  type ProcessingStats {
    total_batches: Int
    successful_batches: Int
    failed_batches: Int
    total_issues: Int
    preprocessing_applied: Boolean
    issues_filtered: Int
    issues_merged: Int
    template_issues_detected: Int
  }

  type HumanFunctionality {
    FunctionalityName: String
    Errors: [htmlCsOutput] 
  }

  type Report {
    axe: axeResult
    htmlcs: htmlCsResult
    score: Int
    totalElements: Int
    siteImg: String
    ByFunctions: [HumanFunctionality]
    processing_stats: ProcessingStats
    template_analysis: TemplateAnalysis
    preprocessing_stats: PreprocessingStats
  }

  type AccessibilityReportMeta {
    id: Int!
    url: String!
    allowed_sites_id: Int
    r2_key: String!
    score: JSON
    created_at: String!
    updated_at: String!
  }

  type SaveReportResponse {
    success: Boolean!
    key: String!
    report: AccessibilityReportMeta
  }

  type AccessibilityReportTableRow {
    url: String!
    r2_key: String!
    created_at: String!
    score: JSON
  } 

  extend type Query {
    getAccessibilityReport(url: String!): Report
    getProcessingDashboard(url: String!): ProcessingDashboard
    getAccessibilityReportMeta(id: Int!): AccessibilityReportMeta
    fetchAccessibilityReportFromR2(
    url: String!
    created_at: String
    updated_at: String
  ): [AccessibilityReportTableRow!]!
    fetchReportByR2Key(r2_key: String!): Report
  }

  type ProcessingDashboard {
    site_url: String
    last_processed: String
    performance_metrics: PerformanceMetrics
    template_insights: TemplateAnalysis
    quality_metrics: QualityMetrics
    cost_optimization: CostOptimization
  }

  type PerformanceMetrics {
    total_processing_time: Int
    preprocessing_time: Int
    gpt_processing_time: Int
    avg_confidence_score: Int
    success_rate: Float
  }

  type QualityMetrics {
    high_confidence_issues: Int
    medium_confidence_issues: Int
    low_confidence_issues: Int
    runner_agreement_rate: Float
    template_detection_rate: Float
  }

  type CostOptimization {
    original_issue_count: Int
    processed_issue_count: Int
    cost_reduction_percentage: Int
    batch_efficiency: Float
    template_savings: Int
    estimated_monthly_savings: String
  }

  extend type Mutation {
    saveAccessibilityReport(
      report: JSON!
      url: String!
      allowed_sites_id: Int
      key: String
      score: JSON
    ): SaveReportResponse!
    deleteAccessibilityReport(r2_key: String!): Boolean!    
  }
`;
