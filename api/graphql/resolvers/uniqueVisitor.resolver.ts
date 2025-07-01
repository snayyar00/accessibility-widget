import { combineResolvers } from 'graphql-resolvers';
import { isAuthenticated } from '~/graphql/resolvers/authorization.resolver';
import { addNewVisitor, deleteVisitorById, deleteVisitorByIp, getSiteVisitors, getSiteVisitorsByURL, getSiteVisitorsByURLAndDate, getVisitorByIp, updateVisitorDetails } from '~/services/uniqueVisitors/uniqueVisitor.service';

const resolvers = {
    Query: {
        getSiteVisitors: combineResolvers(
            isAuthenticated,
            (_, { siteId }, { user }) => getSiteVisitors(siteId, user)
        ),
        getSiteVisitorsByURL: combineResolvers(
            isAuthenticated,
            (_, { url }, { user }) => getSiteVisitorsByURL(url, user)
        ),
        getSiteVisitorsByIp: combineResolvers(
            isAuthenticated,
            (_, { ipAddress }, { user }) => getVisitorByIp(ipAddress, user)
        ),
        getSiteVisitorsByURLAndDate: combineResolvers(
            isAuthenticated,
            (_, { url, startDate, endDate }, { user }) => getSiteVisitorsByURLAndDate(url, new Date(startDate), new Date(endDate), user)
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
