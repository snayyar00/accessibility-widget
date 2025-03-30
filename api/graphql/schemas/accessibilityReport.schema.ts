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

  # New types for machine fixable issues
  type CodeFix {
    original: String
    fixed: String
  }

  type FixableIssue {
    code: String
    element: String
    selector: String
    issue: String
    fix: String
    impact: String
    codeFix: CodeFix
    priority: Int
  }

  type MachineFixableResult {
    url: String
    totalIssues: Int
    fixableIssues: [FixableIssue]
    potentialScoreImprovement: Int
  }

  extend type Query {
    getAccessibilityReport(url: String!): Report
    getMachineFixableIssues(url: String!): MachineFixableResult
  }
`;
