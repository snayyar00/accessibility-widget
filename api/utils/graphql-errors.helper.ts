import { GraphQLError } from 'graphql'

export const createAuthenticationError = (message: string) =>
  new GraphQLError(message, {
    extensions: { code: 'UNAUTHENTICATED' },
  })

export const createValidationError = (message: string) =>
  new GraphQLError(message, {
    extensions: { code: 'BAD_USER_INPUT' },
  })

export const createForbiddenError = (message: string) =>
  new GraphQLError(message, {
    extensions: { code: 'FORBIDDEN' },
  })

export const createUserInputError = (message: string) =>
  new GraphQLError(message, {
    extensions: { code: 'BAD_USER_INPUT' },
  })

export const createApolloError = (message: string) =>
  new GraphQLError(message, {
    extensions: { code: 'INTERNAL_SERVER_ERROR' },
  })

export class ApolloError extends GraphQLError {
  constructor(message: string, code?: string, extensions?: Record<string, any>) {
    super(message, {
      extensions: { code: code || 'INTERNAL_SERVER_ERROR', ...extensions },
    })
  }
}

export class ValidationError extends GraphQLError {
  constructor(message: string) {
    super(message, {
      extensions: { code: 'BAD_USER_INPUT' },
    })
  }
}

export class AuthenticationError extends GraphQLError {
  constructor(message: string) {
    super(message, {
      extensions: { code: 'UNAUTHENTICATED' },
    })
  }
}

export class UserInputError extends GraphQLError {
  constructor(message: string, extensions?: Record<string, unknown>) {
    super(message, {
      extensions: { code: 'BAD_USER_INPUT', ...extensions },
    })
  }
}

export class ForbiddenError extends GraphQLError {
  constructor(message: string) {
    super(message, {
      extensions: { code: 'FORBIDDEN' },
    })
  }
}
