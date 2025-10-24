import { combineResolvers } from 'graphql-resolvers'

import { OrganizationUserRole } from '../../constants/organization.constant'
import { GraphQLContext } from '../../graphql/types'
import { generateOrganizationFaviconUrl, generateOrganizationLogoUrl } from '../../helpers/imgproxy.helper'
import { Organization } from '../../repository/organization.repository'
import { OrganizationUser } from '../../repository/organization_user.repository'
import { AgencyProgramConnectionResponse, AgencyProgramDisconnectionResponse, connectToAgencyProgram, disconnectFromAgencyProgram, updateAgencyAccount } from '../../services/organization/agencyProgram.service'
import { addOrganization, CreateOrganizationInput, editOrganization, getOrganizationByDomainService, getOrganizationById, getOrganizations, removeOrganization, removeUserFromOrganization } from '../../services/organization/organization.service'
import { changeOrganizationUserRole, getOrganizationUsers } from '../../services/organization/organization_users.service'
import { FileUploadResolved, uploadOrganizationFavicon, uploadOrganizationLogo } from '../../services/upload/organizationUpload.service'
import { getOrganizationWorkspaces } from '../../services/workspaces/workspaces.service'
import { ValidationError } from '../../utils/graphql-errors.helper'
import { allowedOrganization, isAuthenticated } from './authorization.resolver'

const organizationResolver = {
  Organization: {
    logo_url: (parent: Organization) => {
      if (!parent.logo_url) return null

      return generateOrganizationLogoUrl(parent.logo_url)
    },

    favicon: (parent: Organization) => {
      if (!parent.favicon) return null

      return generateOrganizationFaviconUrl(parent.favicon)
    },
  },

  OrganizationUser: {
    hasAgencyAccountId: (parent: OrganizationUser) => {
      return !!parent.agencyAccountId
    },
  },

  Query: {
    getUserOrganizations: combineResolvers(allowedOrganization, isAuthenticated, async (_: unknown, __: unknown, { user }): Promise<Organization[]> => {
      const orgs = await getOrganizations(user)

      return orgs || []
    }),

    getOrganizationUsers: combineResolvers(allowedOrganization, isAuthenticated, async (_: unknown, __: unknown, { user }) => getOrganizationUsers(user)),

    getOrganizationWorkspaces: combineResolvers(allowedOrganization, isAuthenticated, async (_: unknown, __: unknown, { user }) => {
      return await getOrganizationWorkspaces(user.current_organization_id, user)
    }),

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

    removeUserFromOrganization: combineResolvers(allowedOrganization, isAuthenticated, async (_: unknown, args: { userId: number }, { user }): Promise<boolean | ValidationError> => {
      try {
        await removeUserFromOrganization(user, args.userId)

        return true
      } catch (err) {
        return err
      }
    }),

    changeOrganizationUserRole: combineResolvers(allowedOrganization, isAuthenticated, async (_: unknown, args: { userId: number; role: OrganizationUserRole }, { user }): Promise<boolean | ValidationError> => {
      try {
        await changeOrganizationUserRole(user, args.userId, args.role)

        return true
      } catch (err) {
        return err
      }
    }),

    uploadOrganizationLogo: combineResolvers(allowedOrganization, isAuthenticated, async (_: unknown, args: { organizationId: string; logo: Promise<unknown> }, { user }): Promise<Organization | null> => {
      const file = (await args.logo) as unknown as FileUploadResolved
      await uploadOrganizationLogo(Number(args.organizationId), file, user)

      const org = await getOrganizationById(args.organizationId, user)
      return org || null
    }),

    uploadOrganizationFavicon: combineResolvers(allowedOrganization, isAuthenticated, async (_: unknown, args: { organizationId: string; favicon: Promise<unknown> }, { user }): Promise<Organization | null> => {
      const file = (await args.favicon) as unknown as FileUploadResolved
      await uploadOrganizationFavicon(Number(args.organizationId), file, user)

      const org = await getOrganizationById(args.organizationId, user)
      return org || null
    }),

    connectToAgencyProgram: combineResolvers(allowedOrganization, isAuthenticated, async (_: unknown, args: { successUrl: string }, { user }): Promise<AgencyProgramConnectionResponse> => {
      return await connectToAgencyProgram(user, args.successUrl)
    }),

    disconnectFromAgencyProgram: combineResolvers(allowedOrganization, isAuthenticated, async (_: unknown, __: unknown, { user }): Promise<AgencyProgramDisconnectionResponse> => {
      return await disconnectFromAgencyProgram(user)
    }),

    updateAgencyAccount: combineResolvers(allowedOrganization, isAuthenticated, async (_: unknown, args: { agencyAccountId: string }, { user }): Promise<boolean> => {
      // @TODO: For Stripe Webhook
      return await updateAgencyAccount(user, args.agencyAccountId)
    }),
  },
}

export default organizationResolver
