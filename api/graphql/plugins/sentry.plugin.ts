import { captureException, Severity, withScope } from '@sentry/node'
import * as Sentry from '@sentry/node'
import { GraphQLError } from 'graphql/error'

import { logGraphQLErrors } from '../../utils/graphql-logger.helper'
import { ErrorContext, RequestContext } from '../types'

/**
 * Apollo Server plugin for Sentry error tracking and logging
 */
export const createSentryPlugin = () => ({
  async requestDidStart(requestContext: RequestContext) {
    const transaction = Sentry.startTransaction({
      op: 'graphql.request',
      name: requestContext.request.operationName || 'GraphQL Query',
    })

    requestContext.contextValue.sentryTransaction = transaction

    return {
      async didEncounterErrors(ctx: ErrorContext) {
        if (!ctx.operation) return

        // Логируем все GraphQL ошибки
        logGraphQLErrors(ctx.errors, ctx.contextValue.req, ctx.request.operationName)

        for (const err of ctx.errors) {
          // Пропускаем известные GraphQL ошибки для Sentry
          if (err instanceof GraphQLError && err.extensions?.code) {
            continue
          }

          withScope((scope) => {
            scope.setTag('kind', ctx.operation?.operation || 'unknown')
            scope.setExtra('query', ctx.request.query)
            scope.setExtra('variables', ctx.request.variables)

            if (err.path) {
              scope.addBreadcrumb({
                category: 'query-path',
                message: err.path.join(' > '),
                level: Severity.Debug,
              })
            }

            scope.setSpan(ctx.contextValue.sentryTransaction)

            const transactionId = ctx.request.http?.headers?.get('x-transaction-id')
            if (transactionId) {
              scope.setTransactionName(transactionId)
            }

            captureException(err)
          })
        }
      },

      async willSendResponse(ctx: RequestContext) {
        const sentryTransaction = ctx.contextValue.sentryTransaction

        if (sentryTransaction) {
          sentryTransaction.finish()
        }
      },
    }
  },
})
