import { combineResolvers } from 'graphql-resolvers'

import { OrganizationUserRole } from '../../constants/organization.constant'
import { GraphQLContext } from '../../graphql/types'
import { generateOrganizationFaviconUrl, generateOrganizationLogoUrl } from '../../helpers/imgproxy.helper'
import { Organization, getOrganizationById as getOrgById } from '../../repository/organization.repository'
import { OrganizationUser } from '../../repository/organization_user.repository'
import { AgencyProgramConnectionResponse, AgencyProgramDisconnectionResponse, connectToAgencyProgram, disconnectFromAgencyProgram, updateAgencyAccount } from '../../services/organization/agencyProgram.service'
import { addOrganization, CreateOrganizationInput, editOrganization, getOrganizationById, getOrganizations, removeOrganization, removeUserFromOrganization } from '../../services/organization/organization.service'
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
    hasAgencyAccountId: async (parent: OrganizationUser) => {
      // Handle null/undefined parent
      if (!parent) {
        return false
      }

         // Check if organization has stripe_account_id AND if it's fully onboarded
      if (parent.organization_id) {
        try {
          // Use repository version (no permission check needed)
          const org = await getOrgById(parent.organization_id)
          if (org?.stripe_account_id) {
            // Account ID exists - now verify it's fully onboarded
            try {
              const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY)
              const account = await stripe.accounts.retrieve(org.stripe_account_id)
              
              // Check if account is fully onboarded
              const isFullyOnboarded = 
                account.charges_enabled === true &&
                account.payouts_enabled === true &&
                account.requirements?.currently_due?.length === 0
              
              console.log('[AGENCY_STATUS]', {
                organizationId: org.id,
                stripeAccountId: org.stripe_account_id,
                charges_enabled: account.charges_enabled,
                payouts_enabled: account.payouts_enabled,
                currently_due: account.requirements?.currently_due?.length || 0,
                isFullyOnboarded,
              })
              
              return isFullyOnboarded
            } catch (stripeError) {
              console.error('Error checking Stripe account onboarding status:', stripeError)
              // If Stripe API fails, return false (account not accessible)
              return false
            }
          }
        } catch (error) {
          // If organization lookup fails, fall back to legacy check
          console.error('Error fetching organization for hasAgencyAccountId:', error)
        }
      }
      
      // Fallback to legacy agencyAccountId on user for backward compatibility
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

    getOrganizationByDomain: combineResolvers(allowedOrganization, async (_: unknown, __: unknown, { organization }: GraphQLContext): Promise<Organization | null | ValidationError> => {
      return organization
    }),

    organizationSmtpSettings: combineResolvers(allowedOrganization, isAuthenticated, async (_: unknown, args: { organizationId: string }, { user }): Promise<{ smtp_host?: string | null; smtp_port?: number | null; smtp_secure?: boolean | null; smtp_user?: string | null } | null> => {
      const org = await getOrganizationById(args.organizationId, user)
      if (!org) return null
      const o = org as { smtp_host?: string | null; smtp_port?: number | null; smtp_secure?: boolean | null; smtp_user?: string | null }
      return {
        smtp_host: o.smtp_host ?? null,
        smtp_port: o.smtp_port ?? null,
        smtp_secure: o.smtp_secure ?? null,
        smtp_user: o.smtp_user ?? null,
      }
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
