import { Response } from 'express'
import { skip } from 'graphql-resolvers'

import { Organization } from '../../repository/organization.repository'
import { UserProfile } from '../../repository/user.repository'
import { AuthenticationError, ForbiddenError } from '../../utils/graphql-errors.helper'

type Context = {
  user?: UserProfile
  res?: Response
  clientDomain: string | null
  allowedFrontendUrl: string | null
  organization: Organization | null
}

export const allowedOrganization = (parent: unknown, args: unknown, { organization }: Context): ForbiddenError => (organization?.domain ? skip : new ForbiddenError('Provided domain is not in the list of allowed organizations'))
export const isAuthenticated = (parent: unknown, args: unknown, { user }: Context): AuthenticationError => (user?.email ? skip : new AuthenticationError('Authentication fail'))
