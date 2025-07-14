import { gql } from 'apollo-server-express';

export const ImpressionsSchema = gql`
  type Impression {
    id: Int!
    site_id: Int!
    visitor_id: Int!
    widget_opened: Boolean!
    widget_closed: Boolean!
    createdAt: String!
    profileCounts: JSON
  }

  type ImpressionUpdateResponse {
    success: Boolean!
    message: String!
  }

  type ImpressionList {
    impressions: [Impression]!
    count: Int!
  }

  type engagementRate {
    engagementRate: Float
    totalEngagements: Int
    totalImpressions: Int
    date: String
  }

  extend type Query {
    getEngagementRates(url: String!, startDate: String, endDate: String): [engagementRate] @rateLimit(limit: 30, duration: 60, message: "Too many engagement rate requests. Please try again later.")
    getImpressionsByURLAndDate(url: String!, startDate: String!, endDate: String!): ImpressionList @rateLimit(limit: 30, duration: 60, message: "Too many impression list requests. Please try again later.")
  }

  extend type Mutation {
    addImpressionsURL(url: String!, ip: String!): [Int] @rateLimit(limit: 1, duration: 5, message: "Too many impression additions. Please try again later.")
    registerInteraction(impressionId: Int!, interaction: String!): Int! @rateLimit(limit: 1, duration: 5, message: "Too many interactions. Please try again later.")
    updateImpressionProfileCounts(impressionId: Int!, profileCounts: JSON!): ImpressionUpdateResponse! @rateLimit(limit: 1, duration: 5, message: "Too many profile updates. Please try again later.")
  }
`;
