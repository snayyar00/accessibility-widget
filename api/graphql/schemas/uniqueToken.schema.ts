export const UniqueTokenSchema = `#graphql
  type TokenValidationResponse {
    validation: String!
    savedState: JSON
    organization: Organization
  }

  extend type Query {
    validateToken(url: String!): TokenValidationResponse! @rateLimit(limit: 60, duration: 60, message: "Too many requests, please try again later.")
  }
`
