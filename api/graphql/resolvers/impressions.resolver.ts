import { combineResolvers } from 'graphql-resolvers'

import { addImpressionsURL, addInteraction, addProfileCount, findImpressionsByURLAndDate, getEngagementRates } from '../../services/Impressions/impressions.service'
import { ApolloError, ForbiddenError, UserInputError, ValidationError } from '../../utils/graphql-errors.helper'
import { allowedOrganization, isAuthenticated } from './authorization.resolver'

// TODO Security - Consider comprehensive security measures for this location
const resolvers = {
  Query: {
    getEngagementRates: combineResolvers(allowedOrganization, isAuthenticated, (_, { url, startDate, endDate }, { user }) => getEngagementRates(user, url, startDate, endDate)),

    getImpressionsByURLAndDate: combineResolvers(allowedOrganization, isAuthenticated, async (_, { url, startDate, endDate }, { user }) => {
      try {
        const result = await findImpressionsByURLAndDate(user, url, new Date(startDate), new Date(endDate))
        return result
      } catch (error) {
        // If it's already a GraphQLError, re-throw it to preserve error type and message
        if (error instanceof UserInputError || error instanceof ForbiddenError || error instanceof ValidationError || error instanceof ApolloError) {
          throw error
        }
        // For unexpected errors, wrap them but preserve the message
        throw new ApolloError(`Error fetching impressions by URL and date: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),
  },
  Mutation: {
    addImpressionsURL: combineResolvers((_, { url, ip }) => addImpressionsURL(ip, url)),
    updateImpressionProfileCounts: combineResolvers((_, { impressionId, profileCounts }) => addProfileCount(impressionId, profileCounts)),
    registerInteraction: combineResolvers((_, { impressionId, interaction }) => addInteraction(impressionId, interaction)),
  },
}

export default resolvers
