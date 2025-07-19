import { combineResolvers } from 'graphql-resolvers'

import { addImpressionsURL, addInteraction, addProfileCount, findImpressionsByURLAndDate, getEngagementRates } from '../../services/Impressions/impressions.service'
import { isAuthenticated } from './authorization.resolver'

// TODO Security - Consider comprehensive security measures for this location
const resolvers = {
  Query: {
    getEngagementRates: combineResolvers(isAuthenticated, (_, { url, startDate, endDate }, { user }) => getEngagementRates(user.id, url, startDate, endDate)),

    getImpressionsByURLAndDate: combineResolvers(isAuthenticated, async (_, { url, startDate, endDate }, { user }) => {
      try {
        const result = await findImpressionsByURLAndDate(user.id, url, new Date(startDate), new Date(endDate))
        return result
      } catch (error) {
        console.error(error)
        throw new Error('Error fetching impressions by URL and date')
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
