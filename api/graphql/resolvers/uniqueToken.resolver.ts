import { combineResolvers } from 'graphql-resolvers';
import { GetVisitorTokenByWebsite } from '~/services/webToken/mongoVisitors';

const resolvers = {
    Query: {
      
      getVisitorTokenByWebsite: combineResolvers(
        (_, {url},  { user }) => GetVisitorTokenByWebsite(url)
      )
    },
   
  };
  
  export default resolvers;
  