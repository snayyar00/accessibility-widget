import { combineResolvers } from 'graphql-resolvers';

import { addImpressions, addImpressionsURL, addInteraction, addProfileCount, findImpressionsBySiteId, findImpressionsByURL, findImpressionsByURLAndDate, getEngagementRates} from '~/services/Impressions/impressions.service';

const resolvers = {
    Query: {
        getImpressionsByURL: combineResolvers(
            // isAuthenticated,
            (_, { url }, {user}) => findImpressionsByURL(user.id, url)
        ),
        getImpressionsBySiteId: combineResolvers(
            // isAuthenticated,
            (_, { siteId }) => findImpressionsBySiteId(siteId)
        ),
        getEngagementRates: combineResolvers(
            // isAuthenticated,
            (_, { url, startDate, endDate }, {user}) => getEngagementRates(user.id, url, startDate, endDate)
        ),
        getImpressionsByURLAndDate: combineResolvers(
            async (_, {  url, startDate, endDate }, {user}) => {
             
                try {
                    const result =  await findImpressionsByURLAndDate(user.id, url, new Date(startDate), new Date(endDate));
                    return result;
                } catch (error) {
                    console.error(error);
                    throw new Error('Error fetching impressions by URL and date');
                }
            }),
        
    },
    Mutation: {
        addImpression: combineResolvers(
            (_, { siteId }, { ip }) => addImpressions(siteId, ip)
        ),
        addImpressionsURL: combineResolvers(
            (_, { url, ip }) => addImpressionsURL(ip, url)
        ),
        updateImpressionProfileCounts:combineResolvers(
            (_, { impressionId, profileCounts}) => addProfileCount(impressionId, profileCounts)
        ),
        registerInteraction: combineResolvers(
            (_, { impressionId, interaction}, ) => addInteraction(impressionId, interaction)
        ),
    },
};

export default resolvers;
