import { gql } from 'apollo-server-express';

export const UniqueTokenSchema = gql`
  type TokenValidationResponse {
    validation: String!
    savedState: JSON
  }

  extend type Query {
    validateToken(url: String!): TokenValidationResponse! @rateLimit(limit: 60, duration: 60, message: "Too many requests, please try again later.")
  }
`;
