import { gql } from 'apollo-server-express';

export const MachineFixableIssuesSchema = gql`
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
    getMachineFixableIssues(url: String!): MachineFixableResult
  }
`; 