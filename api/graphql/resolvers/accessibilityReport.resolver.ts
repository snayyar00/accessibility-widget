import { combineResolvers } from 'graphql-resolvers';
import { fetchAccessibilityReport } from '~/services/accessibilityReport/accessibilityReport.service';

const resolvers = {
  Query: {
    getAccessibilityReport: combineResolvers((_, { url }) => fetchAccessibilityReport(url)),
  },
};

export default resolvers;
