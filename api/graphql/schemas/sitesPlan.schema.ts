import { gql } from 'apollo-server-express';

export const SitesPlanSchema = gql`
  
    type ResponseSitesPlan {
      id: Int!
      allowedSiteId: Int!
      productId: Int!
      priceId: Int!
      name: String!
      amount: Float!
      productType: String!
      priceType: String!
      expiredAt: Date
      deletedAt: Date
    }

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
      getUserSitesPlan: ResponseSitesPlan
      getPlanBySiteIdAndUserId(siteId: Int!): SitesPlanData
    }
  
    extend type Mutation {
      createSitesPlan(paymentMethodToken: String!, planName: String!, billingType: BillingType!, siteId: Int!): Boolean!
      updateSitesPlan(sitesPlanId: Int!, planName: String!, billingType: BillingType!): Boolean!
      deleteSitesPlan(sitesPlanId: Int!): Boolean!
    }
  `;