import { ApolloServer } from '@apollo/server'
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled'
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer'
import { ApolloServerPluginLandingPageLocalDefault, ApolloServerPluginLandingPageProductionDefault } from '@apollo/server/plugin/landingPage/default'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { IResolvers } from '@graphql-tools/utils'
import { Server } from 'http'

import { IS_LOCAL_DEV } from '../config/server.config'
import { rateLimitDirectiveTransformer, rateLimitDirectiveTypeDefs } from './directives/rateLimit'
import { createSentryPlugin } from './plugins/sentry.plugin'
import RootResolver from './root.resolver'
import RootSchema from './root.schema'
import { GraphQLContext } from './types'

/**
 * Creates and configures Apollo GraphQL server
 */
export function createGraphQLServer(httpServer: Server) {
  let schema = makeExecutableSchema({
    typeDefs: [rateLimitDirectiveTypeDefs, RootSchema],
    resolvers: RootResolver as IResolvers[],
  })

  schema = rateLimitDirectiveTransformer(schema)

  let landingPagePlugin

  if (process.env.NODE_ENV === 'production') {
    landingPagePlugin = ApolloServerPluginLandingPageDisabled()
  } else if (IS_LOCAL_DEV) {
    landingPagePlugin = ApolloServerPluginLandingPageLocalDefault({ footer: false })
  } else {
    landingPagePlugin = ApolloServerPluginLandingPageProductionDefault({ footer: false })
  }

  const serverGraph = new ApolloServer<GraphQLContext>({
    schema,
    formatError: (err) => {
      if (err.message.includes('Not authenticated')) {
        return new Error('Please login to make this action')
      }

      if (process.env.NODE_ENV === 'production') {
        const result = err.message.match(/ValidationError: (.*)/)

        if (result && result[1]) {
          return new Error(result[1])
        }
      }

      return err
    },
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer }), createSentryPlugin(), landingPagePlugin],
  })

  return serverGraph
}
