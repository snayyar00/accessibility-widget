import { gql } from 'apollo-server-express';

export const AllowedSitesSchema = gql`

		type Site {
				id: Int
				user_id: Int
				url: String
				updatedAt: String
				createAt: String
				expiredAt: String
				trial:Int
		}

		type siteUpdateResponse{
				success: Boolean!
				message: String!
		}

		type AllowedSitesList {
				sites: [Site]
				count: Int
		}

		extend type Query {
				getUserSites: [Site]
				getSiteByURL(url: String!): Site
				isDomainAlreadyAdded(url: String!): Boolean!
		}

		extend type Mutation {
				addSite(url: String!): String!
				deleteSite(url: String!): Int!
				changeURL(newURL: String!, siteId: Int!): String
		}
		
`;
