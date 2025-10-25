/**
 * Agency Program Service
 * Handles Stripe Express Account integration for organization owners
 *
 * This service manages the connection between organization owners and Stripe Express accounts
 * to enable revenue sharing through the Webability Agency Program.
 */

import { ORGANIZATION_USER_ROLE_OWNER } from '../../constants/organization.constant'
import { updateOrganizationUserAgencyAccount } from '../../repository/organization_user.repository'
import { canManageOrganization } from '../../utils/access.helper'
import { ApolloError, ValidationError } from '../../utils/graphql-errors.helper'
import logger from '../../utils/logger'
import { UserLogined } from '../authentication/get-user-logined.service'

/**
 * Response type for Agency Program connection
 */
export interface AgencyProgramConnectionResponse {
  onboardingUrl: string
  success: boolean
}

/**
 * Response type for Agency Program disconnection
 */
export interface AgencyProgramDisconnectionResponse {
  success: boolean
  message?: string
}

/**
 * Validate URL format
 */
function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Connect organization owner to Agency Program
 * Returns a Stripe onboarding URL for Express Account setup
 *
 * @param user - Current user profile
 * @param successUrl - URL to redirect after successful Stripe onboarding
 * @returns Object with onboarding URL and success status
 *
 * @TODO: Implement actual Stripe Express Account creation
 * Current implementation returns a mock URL for testing
 */
export async function connectToAgencyProgram(user: UserLogined, successUrl: string): Promise<AgencyProgramConnectionResponse> {
  try {
    // Validate input parameters
    if (!successUrl || typeof successUrl !== 'string') {
      throw new ValidationError('Success URL is required')
    }

    if (!isValidUrl(successUrl)) {
      throw new ValidationError('Invalid success URL format. Must be a valid HTTP/HTTPS URL')
    }

    const { id: userId, current_organization_id: organizationId } = user

    if (!userId || !organizationId) {
      throw new ValidationError('No current organization selected')
    }

    // Only owners can connect to agency program
    if (user.currentOrganizationUser.role !== ORGANIZATION_USER_ROLE_OWNER) {
      throw new ApolloError('Only organization owners can connect to the Agency Program', 'FORBIDDEN')
    }

    // Check if already connected
    if (user.currentOrganizationUser.agencyAccountId) {
      logger.warn('Attempt to connect already connected organization', {
        userId,
        organizationId,
        agencyAccountId: user.currentOrganizationUser.agencyAccountId,
      })
      // Allow reconnection/update, don't throw error
    }

    /**
     * @TODO: Replace with actual Stripe Express Account creation
     *
     */

    // MOCK: Return a fake Stripe URL for testing
    logger.info('Agency Program connection requested (MOCK)', {
      userId,
      organizationId,
      orgUserId: user.currentOrganizationUser.id,
      successUrl,
    })

    const mockStripeUrl = `https://connect.stripe.com/setup/mock?state=${organizationId}-${userId}&return_url=${encodeURIComponent(successUrl)}`

    return {
      onboardingUrl: mockStripeUrl,
      success: true,
    }
  } catch (error) {
    logger.error('Error connecting to Agency Program:', error)
    throw error
  }
}

/**
 * Disconnect organization from Agency Program
 * Removes the Stripe Express Account connection
 *
 * @param user - Current user profile
 * @returns Object with success status and optional message
 *
 * @TODO: Implement actual Stripe account disconnection/deletion
 */
export async function disconnectFromAgencyProgram(user: UserLogined): Promise<AgencyProgramDisconnectionResponse> {
  try {
    const { id: userId, current_organization_id: organizationId } = user

    if (!userId || !organizationId) {
      throw new ValidationError('No current organization selected')
    }

    if (!user?.currentOrganizationUser?.id) {
      throw new ValidationError('User is not a member of this organization')
    }

    // Only owners or admins can disconnect
    if (!user.currentOrganizationUser.role || !canManageOrganization(user.currentOrganizationUser.role)) {
      throw new ApolloError('Only organization owners/admins can disconnect from the Agency Program', 'FORBIDDEN')
    }

    if (!user.currentOrganizationUser.agencyAccountId) {
      throw new ValidationError('Organization is not connected to the Agency Program')
    }

    /**
     * @TODO: Optionally delete/disable Stripe Express Account
     *
     */

    // Remove agencyAccountId from database
    await updateOrganizationUserAgencyAccount(user.currentOrganizationUser.id, null)

    logger.info('Disconnected from Agency Program', {
      userId,
      organizationId,
      agencyAccountId: user.currentOrganizationUser.agencyAccountId,
    })

    return {
      success: true,
      message: 'Successfully disconnected from Agency Program',
    }
  } catch (error) {
    logger.error('Error disconnecting from Agency Program:', error)
    throw error
  }
}

/**
 * Update/refresh agency account ID
 * Useful if Stripe account needs to be recreated or updated
 *
 * @param user - Current user profile
 * @param agencyAccountId - Stripe Express Account ID
 * @returns Boolean indicating success
 *
 * @TODO: Add validation that the account exists in Stripe
 */
export async function updateAgencyAccount(user: UserLogined, agencyAccountId: string): Promise<boolean> {
  try {
    // Validate input parameters
    if (!agencyAccountId || typeof agencyAccountId !== 'string') {
      throw new ValidationError('Agency Account ID is required')
    }

    // Validate agencyAccountId format (Stripe account IDs start with 'acct_')
    if (!agencyAccountId.startsWith('acct_')) {
      throw new ValidationError('Invalid agency account ID format. Must start with "acct_"')
    }

    if (agencyAccountId.length < 10) {
      throw new ValidationError('Invalid agency account ID length')
    }

    const { id: userId, current_organization_id: organizationId } = user

    if (!userId || !organizationId) {
      throw new ValidationError('No current organization selected')
    }

    if (!user?.currentOrganizationUser?.id) {
      throw new ValidationError('User is not a member of this organization')
    }

    // Only owners can update agency account
    if (user?.currentOrganizationUser?.role !== ORGANIZATION_USER_ROLE_OWNER) {
      throw new ApolloError('Only organization owners can update the Agency Account', 'FORBIDDEN')
    }

    /**
     * @TODO: Validate that the account exists and belongs to this organization
     *
     * const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
     *
     * const account = await stripe.accounts.retrieve(agencyAccountId);
     *
     * if (!account || account.metadata.organization_id !== organizationId.toString()) {
     *   throw new ValidationError('Invalid agency account ID');
     * }
     */

    await updateOrganizationUserAgencyAccount(user?.currentOrganizationUser?.id, agencyAccountId)

    logger.info('Updated agency account ID', {
      userId,
      organizationId,
      agencyAccountId,
    })

    return true
  } catch (error) {
    logger.error('Error updating agency account:', error)
    throw error
  }
}
