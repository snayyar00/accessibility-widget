import { combineResolvers } from 'graphql-resolvers';
//import { GetVisitorTokenByWebsite, ValidateToken } from '~/services/webToken/mongoVisitors';

const resolvers = {
  Query: {
      
    getVisitorTokenByWebsite: combineResolvers(
      // (_, { url },  { user }) => GetVisitorTokenByWebsite(url),
    ),
    validateToken: combineResolvers(
      (_, { url }) => {
        //return ValidateToken(url);
      },
    ),
  },
   
};
  
export default resolvers;
