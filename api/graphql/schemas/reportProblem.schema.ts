import { gql } from 'graphql-tag'

export const reportProblemSchema = gql`
  extend type Mutation {
    reportProblem(site_url: String!, issue_type: String!, description: String!, reporter_email: String!): String! @rateLimit(limit: 4, duration: 60, message: "Too many reportProblem requests. Please try again later.")
  }
`
