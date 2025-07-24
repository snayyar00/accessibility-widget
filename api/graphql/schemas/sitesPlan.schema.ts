export const SitesPlanSchema = `#graphql
  type SitesPlanData {
    id: Int!
    siteId: Int!
    productId: Int!
    priceId: Int!
    subcriptionId: String!
    customerId: String!
    isTrial: Boolean!
    expiredAt: Date
    isActive: Boolean!
    createdAt: Date
    updatedAt: Date
    deletedAt: Date

    siteName: String!
    productType: String!
    amount: Float!
    priceType: String!
  }

  extend type Query {
    getPlanBySiteIdAndUserId(siteId: Int!): SitesPlanData @rateLimit(limit: 60, duration: 60, message: "Too many plan requests. Please try again later.")
  }

  extend type Mutation {
    updateSitesPlan(sitesPlanId: Int!, planName: String!, billingType: BillingType!): Boolean! @rateLimit(limit: 10, duration: 60, message: "Too many plan updates. Please try again later.")
  }
`
