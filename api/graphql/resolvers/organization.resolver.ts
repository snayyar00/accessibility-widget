import { combineResolvers } from 'graphql-resolvers'

import { GraphQLContext } from '../../graphql/types'
import { Organization } from '../../repository/organization.repository'
import { addOrganization, addUserToOrganizationByEmail, CreateOrganizationInput, editOrganization, getOrganizationByDomainService, getOrganizationById, getOrganizations, removeOrganization, removeUserFromOrganization } from '../../services/organization/organization.service'
import { getOrganizationUsers } from '../../services/organization/organization_users.service'
import { ValidationError } from '../../utils/graphql-errors.helper'
import { allowedOrganization, isAuthenticated } from './authorization.resolver'

const organizationResolver = {
  Query: {
    getUserOrganizations: combineResolvers(allowedOrganization, isAuthenticated, async (_: unknown, __: unknown, { user }): Promise<Organization[]> => {
      const orgs = await getOrganizations(user)

      return orgs || []
    }),

    getOrganizationUsers: combineResolvers(allowedOrganization, isAuthenticated, async (_: unknown, __: unknown, { user }) => getOrganizationUsers(user)),

    getOrganizationByDomain: combineResolvers(allowedOrganization, async (_: unknown, __: unknown, { clientDomain }: GraphQLContext): Promise<Organization | null | ValidationError> => {
      const org = await getOrganizationByDomainService(clientDomain)

      return org || null
    }),
  },

  Mutation: {
    addOrganization: combineResolvers(isAuthenticated, async (_: unknown, args: CreateOrganizationInput, { user }): Promise<Organization | null | ValidationError> => {
      const maybeId = await addOrganization(args, user)

      if (maybeId instanceof Error) return maybeId

      if (maybeId) {
        const org = await getOrganizationById(maybeId, user)
        return org || null
      }

      return null
    }),

    editOrganization: combineResolvers(allowedOrganization, isAuthenticated, async (_: unknown, args: Partial<Organization>, { user }): Promise<Organization | null | ValidationError> => {
      const { id, ...editData } = args
      const maybeUpdated = await editOrganization(editData, user, id)

      if (maybeUpdated instanceof Error) return maybeUpdated

      if (maybeUpdated) {
        const org = await getOrganizationById(id, user)
        return org || null
      }

      return null
    }),

    removeOrganization: combineResolvers(allowedOrganization, isAuthenticated, async (_: unknown, args: { id: number }, { user }): Promise<boolean | ValidationError> => {
      const maybeDeleted = await removeOrganization(user, args.id)

      if (maybeDeleted instanceof Error) return maybeDeleted

      return !!maybeDeleted
    }),

    addUserToOrganizationByEmail: combineResolvers(allowedOrganization, isAuthenticated, async (_: unknown, args: { email: string }, { user }): Promise<boolean | ValidationError> => {
      try {
        await addUserToOrganizationByEmail(user, args.email)

        return true
      } catch (err) {
        return err
      }
    }),

    removeUserFromOrganization: combineResolvers(allowedOrganization, isAuthenticated, async (_: unknown, args: { userId: number }, { user }): Promise<boolean | ValidationError> => {
      try {
        await removeUserFromOrganization(user, args.userId)

        return true
      } catch (err) {
        return err
      }
    }),
  },
}

export default organizationResolver
