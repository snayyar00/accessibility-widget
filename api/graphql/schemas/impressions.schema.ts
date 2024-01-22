import { gql } from 'apollo-server-express';

export const ImpressionsSchema = gql`

		type Impression {
				id: Int!
				site_id: Int!
				visitor_id: Int!
				widget_opened: Boolean!
				widget_closed: Boolean!
				createdAt: String!
		}

		type ImpressionUpdateResponse{
				success: Boolean!
				message: String!
		}

		type ImpressionList {
				impressions: [Impression]!
				count: Int!
		}

		type engagementRate {
			engagementRate: Float,
			totalEngagements: Int,
			totalImpressions: Int
			date: String
		}


		extend type Query {
				getImpressionsByURL(url: String!): ImpressionList
				getImpressionsBySiteId(siteId: Int!): ImpressionList
				getEngagementRates(url: String!, startDate: String, endDate: String): [engagementRate]
				getImpressionsByURLAndDate( url: String!, startDate: String!, endDate: String!): ImpressionList
		}

		extend type Mutation {
				addImpression(siteId: Int!): [Int]
				addImpressionsURL(url: String): [Int]
				registerInteraction(impressionId: Int!, interaction: String!): Int!
		}
		`;
