import { gql } from 'apollo-server-express';

export const AllowedSitesSchema = gql`
  type Site {
    id: Int
    user_id: Int
    url: String
    updatedAt: String
    createAt: String
    expiredAt: String
    trial: Int
  }

  type siteUpdateResponse {
    success: Boolean!
    message: String!
  }

  type AllowedSitesList {
    sites: [Site]
    count: Int
  }

  extend type Query {
    getUserSites: [Site] @rateLimit(limit: 30, duration: 60, message: "Too many site list requests. Please try again later.")
    isDomainAlreadyAdded(url: String!): Boolean! @rateLimit(limit: 10, duration: 60, message: "Too many domain check attempts. Please try again later.")
  }

  extend type Mutation {
    addSite(url: String!): String! @rateLimit(limit: 5, duration: 60, message: "Too many site additions. Please try again later.")
    deleteSite(url: String!): Int! @rateLimit(limit: 10, duration: 60, message: "Too many site deletions. Please try again later.")
    changeURL(newURL: String!, siteId: Int!): String @rateLimit(limit: 10, duration: 60, message: "Too many URL changes. Please try again later.")
  }
`;
