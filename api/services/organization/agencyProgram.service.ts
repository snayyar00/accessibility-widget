/**
 * Agency Program Service
 * Handles Stripe Express Account integration for organization owners
 *
 * This service manages the connection between organization owners and Stripe Express accounts
 * to enable revenue sharing through the Webability Agency Program.
 */

import Stripe from 'stripe'
import { ORGANIZATION_USER_ROLE_OWNER } from '../../constants/organization.constant'
import { getOrganizationById, updateOrganization } from '../../repository/organization.repository'
import { updateOrganizationUserAgencyAccount } from '../../repository/organization_user.repository'
import { canManageOrganization } from '../../utils/access.helper'
import { ApolloError, ValidationError } from '../../utils/graphql-errors.helper'
import logger from '../../utils/logger'
import { UserLogined } from '../authentication/get-user-logined.service'

// Initialize Stripe with API version
const stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY, {
  apiVersion: '2020-08-27',
})

/**
 * Response type for Agency Program connection
 */
export interface AgencyProgramConnectionResponse {
  onboardingUrl: string
  success: boolean
  message?: string
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

    // Check if user has organization membership
    if (!user.currentOrganizationUser) {
      throw new ValidationError('User is not a member of this organization')
    }

    // Only owners can connect to agency program
    if (user.currentOrganizationUser.role !== ORGANIZATION_USER_ROLE_OWNER) {
      throw new ApolloError('Only organization owners can connect to the Agency Program', 'FORBIDDEN')
    }

    // Get organization details
    const organization = await getOrganizationById(organizationId)
    
    if (!organization) {
      throw new ValidationError('Organization not found')
    }

    let stripeAccountId: string
    
    // Check if Stripe account already exists in our database
    if (organization.stripe_account_id) {
      // Use existing account ID
      stripeAccountId = organization.stripe_account_id
      
      logger.info('Using existing Stripe account for Agency Program', {
        userId,
        organizationId,
        stripeAccountId,
      })
    } else {
      // No account exists - create new Stripe Express Account
      stripeAccountId = await createStripeExpressAccount(user, organization)
    }

    // Check if account is already fully verified
    let accountDetails
    try {
      accountDetails = await stripe.accounts.retrieve(stripeAccountId)
      
      // 🧪 TESTING: Log account details
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('🧪 STRIPE ACCOUNT DETAILS (Testing):')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('Account ID:', accountDetails.id)
      console.log('Type:', accountDetails.type)
      console.log('Country:', accountDetails.country)
      console.log('Email:', accountDetails.email)
      console.log('Business Type:', accountDetails.business_type)
      console.log('Charges Enabled:', accountDetails.charges_enabled)
      console.log('Payouts Enabled:', accountDetails.payouts_enabled)
      console.log('Details Submitted:', accountDetails.details_submitted)
      console.log('Capabilities:', JSON.stringify(accountDetails.capabilities, null, 2))
      console.log('Requirements:', JSON.stringify(accountDetails.requirements, null, 2))
      console.log('Metadata:', JSON.stringify(accountDetails.metadata, null, 2))
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      
      // Check if account is fully onboarded
      const isFullyOnboarded = 
        accountDetails.charges_enabled === true &&
        accountDetails.payouts_enabled === true &&
        accountDetails.requirements?.currently_due?.length === 0
      
      if (isFullyOnboarded) {
        logger.info('✅ Account is already fully onboarded - skipping onboarding link', {
          userId,
          organizationId,
          stripeAccountId,
          charges_enabled: accountDetails.charges_enabled,
          payouts_enabled: accountDetails.payouts_enabled,
          currently_due: accountDetails.requirements?.currently_due,
        })
        
        return {
          onboardingUrl: 'ALREADY_CONNECTED',
          success: true,
          message: 'Your account is already fully connected to the Agency Program. No further action needed.',
        }
      }
      
      logger.info('⚠️ Account needs onboarding - creating link', {
        userId,
        organizationId,
        stripeAccountId,
        charges_enabled: accountDetails.charges_enabled,
        payouts_enabled: accountDetails.payouts_enabled,
        currently_due: accountDetails.requirements?.currently_due,
      })
    } catch (stripeError) {
      logger.error('❌ Error retrieving Stripe account:', stripeError)
      // Continue with account link creation even if retrieval fails
    }

    // Generate account link for onboarding/update
    // Stripe will handle if account is invalid and show appropriate error
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: successUrl, // Where to send if they need to restart
      return_url: successUrl,  // Where to send after completion
      type: 'account_onboarding',
    })

    logger.info('Agency Program onboarding link created', {
      userId,
      organizationId,
      stripeAccountId,
    })

    return {
      onboardingUrl: accountLink.url,
      success: true,
    }
  } catch (error) {
    logger.error('Error connecting to Agency Program:', error)
    throw error
  }
}

/**
 * Create a new Stripe Express Account for the organization
 * 
 * @param user - Current user profile
 * @param organization - Organization details
 * @returns Stripe account ID
 */
async function createStripeExpressAccount(user: UserLogined, organization: any): Promise<string> {
  try {
    // Create Stripe Express Account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US', // You may want to make this configurable
      email: user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'company', // or 'individual' based on your use case
      metadata: {
        organization_id: organization.id.toString(),
        organization_name: organization.name,
        organization_domain: organization.domain,
        user_id: user.id.toString(),
      },
    })

    // Save account ID to organization table
    await updateOrganization(organization.id, {
      stripe_account_id: account.id,
    })

    logger.info('Created new Stripe Express Account', {
      userId: user.id,
      organizationId: organization.id,
      stripeAccountId: account.id,
    })

    return account.id
  } catch (error) {
    logger.error('Error creating Stripe Express Account:', error)
    throw new ApolloError('Failed to create Stripe account. Please try again.')
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
