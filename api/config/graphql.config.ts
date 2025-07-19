import { ApolloServer, ApolloError } from 'apollo-server-express';
import { withScope, Severity, captureException } from '@sentry/node';
import * as Sentry from '@sentry/node';
import { IResolvers } from '@graphql-tools/utils';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { Request, Response } from 'express';

import RootSchema from '../graphql/root.schema';
import RootResolver from '../graphql/root.resolver';
import getUserLogined from '../services/authentication/get-user-logined.service';
import { rateLimitDirectiveTransformer, rateLimitDirectiveTypeDefs } from '../graphql/directives/rateLimit';
import { IS_LOCAL_DEV } from './server.config';

type ContextParams = {
  req: Request;
  res: Response;
};

export function createGraphQLServer() {
  let schema = makeExecutableSchema({
    typeDefs: [rateLimitDirectiveTypeDefs, RootSchema],
    resolvers: RootResolver as IResolvers[],
  });

  schema = rateLimitDirectiveTransformer(schema);

  const serverGraph = new ApolloServer({
    schema,
    playground: IS_LOCAL_DEV,
    formatError: (err) => {
      if (err.message.includes('Not authenticated')) {
        return new Error('Please login to make this action');
      }

      if (process.env.NODE_ENV === 'production') {
        const result = err.message.match(/ValidationError: (.*)/);

        if (result && result[1]) {
          return new Error(result[1]);
        }
      }

      return err;
    },
    plugins: [
      {
        // Add Sentry tracing for GraphQL operations
        requestDidStart(requestContext) {
          const transaction = Sentry.startTransaction({
            op: 'graphql.request',
            name: requestContext.request.operationName || 'GraphQL Query',
          });

          // Store the transaction on the request context
          requestContext.context.sentryTransaction = transaction;

          return {
            didEncounterErrors(ctx) {
              // Capture any errors that occur during operation execution
              if (!ctx.operation) return;

              for (const err of ctx.errors) {
                if (err instanceof ApolloError) {
                  continue;
                }

                withScope((scope) => {
                  scope.setTag('kind', ctx.operation.operation);
                  scope.setExtra('query', ctx.request.query);
                  scope.setExtra('variables', ctx.request.variables);

                  if (err.path) {
                    scope.addBreadcrumb({
                      category: 'query-path',
                      message: err.path.join(' > '),
                      level: Severity.Debug,
                    });
                  }

                  // Set the transaction on the scope
                  scope.setSpan(ctx.context.sentryTransaction);

                  const transactionId = ctx.request.http.headers.get('x-transaction-id');
                  if (transactionId) {
                    scope.setTransactionName(transactionId);
                  }

                  captureException(err);
                });
              }
            },

            // Finish the transaction when the request is complete
            willSendResponse(ctx) {
              const transactionSentry = ctx.context.sentryTransaction;
              if (transactionSentry) {
                transactionSentry.finish();
              }
            },
          };
        },
      },
    ],

    context: async ({ req, res }: ContextParams) => {
      const { cookies } = req;
      const bearerToken = cookies.token || null;
      const user = await getUserLogined(bearerToken, res);

      return {
        req,
        res,
        user,
      };
    },
  });

  return serverGraph;
}
