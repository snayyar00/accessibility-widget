import * as Sentry from '@sentry/node'
import { Request, Response } from 'express'
import { GraphQLError } from 'graphql/error'

import { UserLoginedResponse } from '../services/authentication/get-user-logined.service'

export type ContextParams = {
  req: Request
  res: Response
}

export interface GraphQLContext {
  req: Request
  res: Response
  user: UserLoginedResponse
  sentryTransaction?: ReturnType<typeof Sentry.startTransaction>
}

export interface RequestContext {
  request: {
    query?: string
    variables?: Record<string, unknown>
    operationName?: string
    http?: {
      headers?: {
        get: (name: string) => string | undefined
      }
    }
  }
  contextValue: GraphQLContext
}

export interface ErrorContext extends RequestContext {
  operation?: {
    operation: string
  }
  errors: readonly GraphQLError[]
}
