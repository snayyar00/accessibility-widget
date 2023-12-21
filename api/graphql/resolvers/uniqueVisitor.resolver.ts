import { combineResolvers } from 'graphql-resolvers';
import { addNewVisitor, deleteVisitorById, deleteVisitorByIp, getSiteVisitors, getSiteVisitorsByURL, getVisitorByIp, updateVisitorDetails } from '~/services/uniqueVisitors/uniqueVisitor.service';

const resolvers = {
    Query: {
        getSiteVisitors: combineResolvers(
            // isAuthenticated,
            (_, { siteId }) => getSiteVisitors(siteId)
        ),
        getSiteVisitorsByURL: combineResolvers(
            // isAuthenticated,
            (_, { url }) => getSiteVisitorsByURL(url)
        ),
        getSiteVisitorsByIp: combineResolvers(
            // isAuthenticated,
            (_, { ipAddress }) => getVisitorByIp(ipAddress)
        ),

    },
    Mutation: {
        addNewVisitor: combineResolvers(
            (_, { siteId }, { ip }) => addNewVisitor(ip, siteId),
        ),
        addNewVisitorWithIp: combineResolvers(
            (_, { siteId, ipAddress }, ) => addNewVisitor(ipAddress, siteId),
        ),
        updateVisitorDetails: combineResolvers(
            (_, { data }, { ip }) => updateVisitorDetails(ip, data),
        ),
        deleteVisitorByIp: combineResolvers(
          (_, { ipAddress },) => deleteVisitorByIp(ipAddress),
        ),
        deleteVisitorById: combineResolvers(
          (_, { siteId },) => deleteVisitorById(siteId),
        ),
    },
};

export default resolvers;
