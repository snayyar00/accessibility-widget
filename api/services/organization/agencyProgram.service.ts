/**
 * Agency Program Service
 * Handles Stripe Express Account integration for organization owners
 *
 * This service manages the connection between organization owners and Stripe Express accounts
 * to enable revenue sharing through the Webability Agency Program.
 */

import { ORGANIZATION_USER_ROLE_OWNER } from '../../constants/organization.constant'
import { getOrganizationUser, updateOrganizationUserAgencyAccount } from '../../repository/organization_user.repository'
import { UserProfile } from '../../repository/user.repository'
import { canManageOrganization } from '../../utils/access.helper'
import { ApolloError, ValidationError } from '../../utils/graphql-errors.helper'
import logger from '../../utils/logger'

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
export async function connectToAgencyProgram(user: UserProfile, successUrl: string): Promise<AgencyProgramConnectionResponse> {
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

    // Get organization user relationship
    const orgUser = await getOrganizationUser(userId, organizationId)

    if (!orgUser) {
      throw new ValidationError('User is not a member of this organization')
    }

    // Only owners can connect to agency program
    if (orgUser.role !== ORGANIZATION_USER_ROLE_OWNER) {
      throw new ApolloError('Only organization owners can connect to the Agency Program', 'FORBIDDEN')
    }

    // Check if already connected
    if (orgUser.agencyAccountId) {
      logger.warn('Attempt to connect already connected organization', {
        userId,
        organizationId,
        agencyAccountId: orgUser.agencyAccountId,
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
      orgUserId: orgUser.id,
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
export async function disconnectFromAgencyProgram(user: UserProfile): Promise<AgencyProgramDisconnectionResponse> {
  try {
    const { id: userId, current_organization_id: organizationId } = user

    if (!userId || !organizationId) {
      throw new ValidationError('No current organization selected')
    }

    const orgUser = await getOrganizationUser(userId, organizationId)

    if (!orgUser) {
      throw new ValidationError('User is not a member of this organization')
    }

    // Only owners or admins can disconnect
    if (!canManageOrganization(orgUser.role)) {
      throw new ApolloError('Only organization owners/admins can disconnect from the Agency Program', 'FORBIDDEN')
    }

    if (!orgUser.agencyAccountId) {
      throw new ValidationError('Organization is not connected to the Agency Program')
    }

    /**
     * @TODO: Optionally delete/disable Stripe Express Account
     *
     */

    // Remove agencyAccountId from database
    await updateOrganizationUserAgencyAccount(orgUser.id, null)

    logger.info('Disconnected from Agency Program', {
      userId,
      organizationId,
      agencyAccountId: orgUser.agencyAccountId,
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
export async function updateAgencyAccount(user: UserProfile, agencyAccountId: string): Promise<boolean> {
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

    const orgUser = await getOrganizationUser(userId, organizationId)

    if (!orgUser) {
      throw new ValidationError('User is not a member of this organization')
    }

    // Only owners can update agency account
    if (orgUser.role !== ORGANIZATION_USER_ROLE_OWNER) {
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

    await updateOrganizationUserAgencyAccount(orgUser.id, agencyAccountId)

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
