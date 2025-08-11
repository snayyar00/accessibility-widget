export const DomainAnalysisSchema = `#graphql
  type DomainAnalysisResult {
    url: String!
    status: String!
    insights: JSON
    error: String
    timestamp: Date!
  }

  extend type Query {
    analyzeDomain(domain: String!): DomainAnalysisResult! @rateLimit(limit: 10, duration: 60, message: "Too many domain analysis requests. Please try again later.")
  }
`
