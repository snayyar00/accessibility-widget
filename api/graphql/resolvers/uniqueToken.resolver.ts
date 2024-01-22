import { combineResolvers } from 'graphql-resolvers';
import { GetVisitorTokenByWebsite, ValidateToken } from '~/services/webToken/mongoVisitors';

const resolvers = {
    Query: {
      
      getVisitorTokenByWebsite: combineResolvers(
        (_, {url},  { user }) => GetVisitorTokenByWebsite(url)
      ),
      validateToken: combineResolvers(
        (_, {token} ) => ValidateToken(token)
      )
    },
   
  };
  
  export default resolvers;
  