import { gql } from 'apollo-server-express';

export const ImpressionsSchema = gql`

		type Impression {
				id: Int!
				site_id: Int!
				visitor_id: Int!
				widget_opened: Boolean!
				widget_closed: Boolean!
				createAt: String!
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
			engagement: Float,
			date: String
		}


		extend type Query {
				getImpressionsByURL(url: String!): ImpressionList
				getImpressionsBySiteId(siteId: Int!): ImpressionList
				getImpressionsByURLDate(url: String!, startDate: String, endDate: String): [engagementRate]
		}

		extend type Mutation {
				addImpression(siteId: Int!): [Int]
				registerInteraction(impressionId: Int!, interaction: String!): Int!
		}
		`;
