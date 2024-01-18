import { gql } from 'apollo-server-express';

export const AccessibilitySchema = gql`

type Status {
  success: Boolean
  httpstatuscode: Int
}

type Statistics {
  pagetitle: String
  pageurl: String
  time: Float
  creditsremaining: Int
  allitemcount: Int
  totalelements: Int
  waveurl: String
}

type AccessibilityScore{
    score: Int,
    totalElements: Int
}

type Report {
  status: Status
  statistics: Statistics
  categories: JSON
  accessibilityScore: AccessibilityScore
}

extend type Query {
  getAccessibilityReport(url: String!, reportType: Int!): Report
}

`;
