import { combineResolvers } from 'graphql-resolvers';
import { isAuthenticated } from './authorization.resolver';
import { createSitesPlan, deleteSitesPlan, getPlanBySiteIdAndUserId, updateSitesPlan } from '~/services/allowedSites/plans-sites.service';

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
    createSitesPlan: combineResolvers(
      isAuthenticated,
      (_, { paymentMethodToken, planName, billingType, siteId,couponCode }, { user }) => createSitesPlan(user.id, paymentMethodToken, planName, billingType, siteId,couponCode),
    ),
    updateSitesPlan: combineResolvers(
      isAuthenticated,
      (_, { sitesPlanId, planName, billingType }) => updateSitesPlan(sitesPlanId, planName, billingType),
    ),
    deleteSitesPlan: combineResolvers(
      isAuthenticated,
      (_, { sitesPlanId }) => deleteSitesPlan(sitesPlanId),
    ),
  },
};

export default resolvers;