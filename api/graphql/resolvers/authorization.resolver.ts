import { Response } from 'express'
import { skip } from 'graphql-resolvers'

import { Organization } from '../../repository/organization.repository'
import { UserLogined } from '../../services/authentication/get-user-logined.service'
import { AuthenticationError, ForbiddenError } from '../../utils/graphql-errors.helper'

type Context = {
  user?: UserLogined
  res?: Response
  domainFromRequest: string | null
  allowedFrontendUrl: string | null
  organization: Organization | null
}

export const allowedOrganization = (parent: unknown, args: unknown, { organization }: Context): ForbiddenError => (organization?.domain ? skip : new ForbiddenError('Provided domain is not in the list of allowed organizations'))
export const isAuthenticated = (parent: unknown, args: unknown, { user }: Context): AuthenticationError => (user?.email ? skip : new AuthenticationError('Authentication fail'))
export const isSuperAdmin = (parent: unknown, args: unknown, { user }: Context): ForbiddenError => (user?.is_super_admin ? skip : new ForbiddenError('Only super admins can perform this action'))
