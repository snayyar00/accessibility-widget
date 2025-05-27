import { gql } from 'apollo-server-express';

export const AccessibilitySchema = gql`
  type axeOutput {
    message: String
    context: [String]
    selectors: [String]
    impact: String
    description: String
    help: String
  }

  type htmlCsOutput {
    code: String
    message: String
    context: [String]
    selectors: [String]
    description: String
    recommended_action: String
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
  }

  type AccessibilityReportMeta {
    id: Int!
    url: String!
    allowed_sites_id: Int
    r2_key: String!
    created_at: String!
    updated_at: String!
  }

  type SaveReportResponse {
    success: Boolean!
    key: String!
    report: AccessibilityReportMeta
  }

  extend type Query {
    getAccessibilityReport(url: String!): Report
    getAccessibilityReportMeta(id: Int!): AccessibilityReportMeta
    fetchAccessibilityReportFromR2(
    url: String!
    created_at: String
    updated_at: String
  ): [Report]!
  }

  extend type Mutation {
    saveAccessibilityReport(
      report: JSON!
      url: String!
      allowed_sites_id: Int
      key: String
    ): SaveReportResponse!
  }
`;
