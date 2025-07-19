import { ApolloServer } from '@apollo/server'
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { IResolvers } from '@graphql-tools/utils'
import { captureException, Severity, withScope } from '@sentry/node'
import * as Sentry from '@sentry/node'
import { Request, Response } from 'express'
import { GraphQLError } from 'graphql'

import { rateLimitDirectiveTransformer, rateLimitDirectiveTypeDefs } from '../graphql/directives/rateLimit'
import RootResolver from '../graphql/root.resolver'
import RootSchema from '../graphql/root.schema'
import getUserLogined from '../services/authentication/get-user-logined.service'
import { IS_LOCAL_DEV } from './server.config'

type ContextParams = {
  req: Request
  res: Response
}

export function createGraphQLServer() {
  let schema = makeExecutableSchema({
    typeDefs: [rateLimitDirectiveTypeDefs, RootSchema],
    resolvers: RootResolver as IResolvers[],
  })

  schema = rateLimitDirectiveTransformer(schema)

  const serverGraph = new ApolloServer({
    schema,
    // Replace playground with modern equivalent for Apollo Server 5
    ...(IS_LOCAL_DEV && {
      plugins: [ApolloServerPluginLandingPageLocalDefault({ footer: false })],
    }),
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
    plugins: [
      {
        // Add Sentry tracing for GraphQL operations
        async requestDidStart(requestContext: any) {
          const transaction = Sentry.startTransaction({
            op: 'graphql.request',
            name: requestContext.request.operationName || 'GraphQL Query',
          })

          // Store the transaction on the request context (Apollo Server 5 uses contextValue)
          requestContext.contextValue.sentryTransaction = transaction

          return {
            async didEncounterErrors(ctx: any) {
              // Capture any errors that occur during operation execution
              if (!ctx.operation) return

              for (const err of ctx.errors) {
                // Adapt check for Apollo Server 5
                if (err instanceof GraphQLError && err.extensions?.code) {
                  continue
                }

                withScope((scope) => {
                  scope.setTag('kind', ctx.operation.operation)
                  scope.setExtra('query', ctx.request.query)
                  scope.setExtra('variables', ctx.request.variables)

                  if (err.path) {
                    scope.addBreadcrumb({
                      category: 'query-path',
                      message: err.path.join(' > '),
                      level: Severity.Debug,
                    })
                  }

                  // Set the transaction on the scope (Apollo Server 5 uses contextValue)
                  scope.setSpan(ctx.contextValue.sentryTransaction)

                  // Adapt for Apollo Server 5
                  const transactionId = ctx.request.http?.headers?.get('x-transaction-id')
                  if (transactionId) {
                    scope.setTransactionName(transactionId)
                  }

                  captureException(err)
                })
              }
            },

            // Finish the transaction when the request is complete
            async willSendResponse(ctx: any) {
              const transactionSentry = ctx.contextValue.sentryTransaction
              if (transactionSentry) {
                transactionSentry.finish()
              }
            },
          }
        },
      },
      // Add landing page only in dev mode
      ...(IS_LOCAL_DEV ? [ApolloServerPluginLandingPageLocalDefault({ footer: false })] : []),
    ],

    // NOTE: In Apollo Server 5, context is removed from constructor!
    // Context is now passed through expressMiddleware in server.ts
  })

  return serverGraph
}

// Export function for creating context (used in server.ts)
export async function createGraphQLContext({ req, res }: ContextParams) {
  const { cookies } = req
  const bearerToken = cookies.token || null
  const user = await getUserLogined(bearerToken, res)

  return {
    req,
    res,
    user,
  }
}
