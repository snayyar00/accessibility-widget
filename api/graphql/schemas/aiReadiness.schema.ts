export const aiReadinessSchema = `#graphql
  type AIReadinessCheck {
    id: String!
    label: String!
    status: String!
    score: Int!
    details: String!
    recommendation: String!
  }

  type AIReadinessResult {
    success: Boolean!
    url: String!
    overallScore: Int!
    checks: [AIReadinessCheck!]!
    htmlContent: String!
    metadata: AIReadinessMetadata!
  }

  type AIReadinessMetadata {
    title: String
    description: String
    analyzedAt: String!
  }


  extend type Query {
    _placeholder: String
  }

  extend type Mutation {
    analyzeAIReadiness(url: String!): AIReadinessResult!
  }
`
