import { ValidationError } from 'apollo-server-express'
import { combineResolvers } from 'graphql-resolvers'

import { Organization } from '../../repository/organization.repository'
import { addOrganization, CreateOrganizationInput, editOrganization, getOrganizationById, getOrganizations, removeOrganization } from '../../services/organization/organization.service'
import { getOrganizationUsers } from '../../services/organization/organization_users.service'
import { isAuthenticated } from './authorization.resolver'

const organizationResolver = {
  Query: {
    getUserOrganizations: combineResolvers(isAuthenticated, async (_: unknown, __: unknown, { user }): Promise<Organization[]> => {
      const orgs = await getOrganizations(user)

      return orgs || []
    }),

    getOrganizationUsers: combineResolvers(isAuthenticated, async (_: unknown, __: unknown, { user }) => getOrganizationUsers(user)),
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

    editOrganization: combineResolvers(isAuthenticated, async (_: unknown, args: Partial<Organization>, { user }): Promise<Organization | null | ValidationError> => {
      const { id, ...editData } = args
      const maybeUpdated = await editOrganization(editData, user, id)

      if (maybeUpdated instanceof Error) return maybeUpdated

      if (maybeUpdated) {
        const org = await getOrganizationById(id, user)
        return org || null
      }

      return null
    }),

    removeOrganization: combineResolvers(isAuthenticated, async (_: unknown, args: { id: number }, { user }): Promise<boolean | ValidationError> => {
      const maybeDeleted = await removeOrganization(user, args.id)

      if (maybeDeleted instanceof Error) return maybeDeleted

      return !!maybeDeleted
    }),
  },
}

export default organizationResolver
