export const AllowedSitesSchema = `#graphql
  type SiteWorkspace {
    id: Int!
    name: String!
  }

  type Site {
    id: Int
    user_id: Int
    url: String
    updatedAt: String
    createAt: String
    expiredAt: String
    trial: Int
    organization_id: Int
    monitor_enabled: Boolean
    status: String
    monitor_priority: Int
    last_monitor_check: String
    is_currently_down: Int
    monitor_consecutive_fails: Int
    is_owner: Boolean
    workspaces: [SiteWorkspace]
    user_email: String
  }

  type PaginatedSites {
    sites: [Site]!
    total: Int!
  }

  extend type Query {
    getUserSites(limit: Int, offset: Int, filter: String, search: String): PaginatedSites @rateLimit(limit: 60, duration: 60, message: "Too many site list requests. Please try again later.")
    getAvailableSitesForWorkspace: [Site] @rateLimit(limit: 60, duration: 60, message: "Too many site list requests. Please try again later.")
    isDomainAlreadyAdded(url: String!): Boolean! @rateLimit(limit: 10, duration: 60, message: "Too many domain check attempts. Please try again later.")
  }

  extend type Mutation {
    addSite(url: String!): String! @rateLimit(limit: 5, duration: 60, message: "Too many site additions. Please try again later.")
    deleteSite(url: String!): Int! @rateLimit(limit: 10, duration: 60, message: "Too many site deletions. Please try again later.")
    changeURL(newURL: String!, siteId: Int!): String @rateLimit(limit: 10, duration: 60, message: "Too many URL changes. Please try again later.")
    toggleSiteMonitoring(siteId: Int!, enabled: Boolean!): Boolean! @rateLimit(limit: 30, duration: 60, message: "Too many monitoring toggle attempts. Please try again later.")
  }
`
