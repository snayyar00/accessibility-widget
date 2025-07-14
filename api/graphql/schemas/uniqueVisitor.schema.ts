import { gql } from 'apollo-server-express';

export const UniqueVisitorSchema = gql`
  type Visitor {
    id: Int
    siteId: Int
    ipAddress: String
    city: String
    country: String
    zipcode: String
    continent: String
    firstVisit: String
  }

  type visitorResponse {
    visitors: [Visitor]
    count: Int
  }

  extend type Query {
    getSiteVisitorsByURL(url: String!): visitorResponse @rateLimit(limit: 60, duration: 60, message: "Too many requests, please try again later.")
  }
`;
