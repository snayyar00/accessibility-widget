import { combineResolvers } from 'graphql-resolvers';
import { fetchAccessibilityReport, getMachineFixableIssues } from '~/services/accessibilityReport/accessibilityReport.service';

const resolvers = {
  Query: {
    getAccessibilityReport: combineResolvers((_, { url }) => 
      fetchAccessibilityReport(url)
    ),
    getMachineFixableIssues: combineResolvers((_, { url }) => 
      getMachineFixableIssues(url)
    ),
  },
};

export default resolvers;
