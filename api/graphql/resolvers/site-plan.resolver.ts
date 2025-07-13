import { combineResolvers } from 'graphql-resolvers';
import { isAuthenticated } from './authorization.resolver';
import { getPlanBySiteIdAndUserId, updateSitesPlan } from '~/services/allowedSites/plans-sites.service';

const resolvers = {
  Query: {
    getPlanBySiteIdAndUserId: combineResolvers(
      isAuthenticated,
      async (_, { siteId }, { user }) => {
        const result = await getPlanBySiteIdAndUserId(user.id, siteId);
        console.log('Resolver result:', result);
        return result;
      },
    ),
  },
  Mutation: {
    updateSitesPlan: combineResolvers(
      isAuthenticated,
      (_, { sitesPlanId, planName, billingType }, {user}) => updateSitesPlan(user.id, sitesPlanId, planName, billingType),
    ),
  },
};

export default resolvers;