import { combineResolvers } from 'graphql-resolvers';
import { isAuthenticated } from './authorization.resolver';
import { createSitesPlan, deleteSitesPlan, getPlanBySiteIdAndUserId, getUserSitesPlan, updateSitesPlan } from '~/services/allowedSites/plans-sites.service';

const resolvers = {
  Query: {
    getUserSitesPlan: combineResolvers(
      isAuthenticated,
      (_, args, { user }) => getUserSitesPlan(user.id),
    ),
    getPlanBySiteIdAndUserId: combineResolvers(
      isAuthenticated,
      (_, { siteId }, { user }) => getPlanBySiteIdAndUserId(user.id, siteId),
    ),
  },
  Mutation: {
    createSitesPlan: combineResolvers(
      isAuthenticated,
      (_, { paymentMethodToken, planName, billingType, siteId }, { user }) => createSitesPlan(user.id, paymentMethodToken, planName, billingType, siteId),
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