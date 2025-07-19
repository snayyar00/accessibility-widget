import { combineResolvers } from 'graphql-resolvers';
import { isAuthenticated } from "./authorization.resolver";
import { getSiteVisitorsByURL } from '../../services/uniqueVisitors/uniqueVisitor.service';

const resolvers = {
  Query: {
    getSiteVisitorsByURL: combineResolvers(isAuthenticated, (_, { url }, { user }) => getSiteVisitorsByURL(url, user)),
  },
};

export default resolvers;
