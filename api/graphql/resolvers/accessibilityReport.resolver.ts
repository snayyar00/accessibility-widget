import { combineResolvers } from 'graphql-resolvers';
import { fetchAccessibilityReport } from '~/services/accessibilityReport/accessibilityReport.service';

const resolvers = {
  Query: {
    getAccessibilityReport: combineResolvers(
      (_, { url, reportType }) => fetchAccessibilityReport(url, reportType)
    ),
  },
};

export default resolvers;
