import { Response } from 'express'
import { skip } from 'graphql-resolvers'

import { UserProfile } from '../../repository/user.repository'
import { AuthenticationError } from '../../utils/graphql-errors.helper'

type Context = {
  user?: UserProfile
  res?: Response
}

export const isAuthenticated = (parent: unknown, args: unknown, { user }: Context): AuthenticationError => (user?.email ? skip : new AuthenticationError('Authentication fail'))
