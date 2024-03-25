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

  type Report {
    axe: axeResult
    htmlcs: htmlCsResult
    score: Int
    totalElements: Int
    siteImg: String
  }

  extend type Query {
    getAccessibilityReport(url: String!): Report
  }
`;
