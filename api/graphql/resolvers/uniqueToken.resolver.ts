import { combineResolvers } from 'graphql-resolvers';
import { ValidateToken } from '../../repository/uniqueToken.repository';

const resolvers = {
  Query: {
    validateToken: combineResolvers((_, { url }) => ValidateToken(url)),
  },
};

export default resolvers;
