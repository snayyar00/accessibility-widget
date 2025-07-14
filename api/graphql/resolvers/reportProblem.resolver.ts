import { combineResolvers } from 'graphql-resolvers';
import { handleReportProblem } from '~/services/problemReport/reportProblem';

const resolvers = {
  Mutation: {
    reportProblem: combineResolvers(async (_, args) => {
      return await handleReportProblem(args.site_url, args.issue_type, args.description, args.reporter_email);
    }),
  },
};

export default resolvers;
