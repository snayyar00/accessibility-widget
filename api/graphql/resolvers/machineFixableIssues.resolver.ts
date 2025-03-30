import { combineResolvers } from 'graphql-resolvers';
import { getMachineFixableIssues } from '~/services/accessibilityReport/machineFixableIssues.service';

const resolvers = {
  Query: {
    getMachineFixableIssues: combineResolvers((_, { url }) => 
      getMachineFixableIssues(url)
    ),
  },
};

export default resolvers; 