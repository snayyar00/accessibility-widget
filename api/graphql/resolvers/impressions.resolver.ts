import { combineResolvers } from 'graphql-resolvers';
import { addImpressions, addInteraction, findImpressionsBySiteId, findImpressionsByURL, findImpressionsByURLDate } from '~/services/Impressions/impressions.service';

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
        getImpressionsByURLDate: combineResolvers(
            // isAuthenticated,
            (_, { url, startDate, endDate }, {user}) => findImpressionsByURLDate(user.id, url, startDate, endDate)
        ),

    },
    Mutation: {
        addImpression: combineResolvers(
            (_, { siteId }, { ip }) => addImpressions(siteId, ip)
        ),
        registerInteraction: combineResolvers(
            (_, { impressionId, interaction}, ) => addInteraction(impressionId, interaction)
        ),
    },
};

export default resolvers;
