import { Request, Response } from 'express'
import Stripe from 'stripe'

import { ORGANIZATION_USER_ROLE_OWNER } from '../../constants/organization.constant'
import { getOrganizationById } from '../../repository/organization.repository'
import { UserLogined } from '../../services/authentication/get-user-logined.service'

const stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY, {
  apiVersion: '2020-08-27',
})

/**
 * Create Agency Dashboard Login Link
 * Generates a login link to the Stripe Express Dashboard for connected accounts
 * This allows agencies to view their earnings, payouts, and transaction history
 *
 * @param req - Request with authenticated user
 * @param res - Response with dashboard URL
 */
export async function createAgencyDashboardLink(req: Request & { user: UserLogined }, res: Response) {
  try {
    const { user } = req

    // Validate user has a current organization
    if (!user.current_organization_id) {
      return res.status(400).json({ 
        error: 'No organization selected',
        message: 'Please select an organization to access the agency dashboard.' 
      })
    }

    // Check if user is a member of the organization
    if (!user.currentOrganizationUser) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You are not a member of this organization.' 
      })
    }

    // CRITICAL: Only organization owners can access the agency dashboard
    if (user.currentOrganizationUser.role !== ORGANIZATION_USER_ROLE_OWNER) {
      console.warn('[AGENCY_DASHBOARD] ⚠️ Non-owner attempted to access dashboard:', {
        userId: user.id,
        userEmail: user.email,
        organizationId: user.current_organization_id,
        userRole: user.currentOrganizationUser.role,
      })
      
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'Only organization owners can access the agency billing dashboard.' 
      })
    }

    // Get organization details
    const organization = await getOrganizationById(user.current_organization_id)

    if (!organization) {
      return res.status(404).json({ 
        error: 'Organization not found',
        message: 'The selected organization could not be found.' 
      })
    }

    // Check if organization has a Stripe account connected
    if (!organization.stripe_account_id) {
      return res.status(400).json({ 
        error: 'Not connected to Agency Program',
        message: 'This organization is not connected to the Agency Program. Please connect first.' 
      })
    }

    console.log('[AGENCY_DASHBOARD] Creating login link for organization:', {
      organizationId: organization.id,
      organizationName: organization.name,
      stripeAccountId: organization.stripe_account_id,
      userId: user.id,
    })

    try {
      // Verify the account exists and is valid
      const account = await stripe.accounts.retrieve(organization.stripe_account_id)

      if (!account) {
        console.error('[AGENCY_DASHBOARD] Account not found in Stripe:', organization.stripe_account_id)
        return res.status(400).json({ 
          error: 'Invalid Stripe account',
          message: 'The connected Stripe account could not be found. Please reconnect to the Agency Program.' 
        })
      }

      // Check if account is fully onboarded
      if (!account.charges_enabled || !account.payouts_enabled) {
        console.warn('[AGENCY_DASHBOARD] Account not fully onboarded:', {
          stripeAccountId: organization.stripe_account_id,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
        })
        
        return res.status(400).json({ 
          error: 'Account setup incomplete',
          message: 'Please complete your Stripe account setup before accessing the dashboard.' 
        })
      }

      console.log('[AGENCY_DASHBOARD] Account verified:', {
        stripeAccountId: account.id,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
      })
    } catch (accountError) {
      console.error('[AGENCY_DASHBOARD] Error verifying account:', accountError)
      return res.status(500).json({ 
        error: 'Failed to verify Stripe account',
        message: 'Could not verify your Stripe account. Please try again or reconnect to the Agency Program.' 
      })
    }

    // Create login link to Stripe Express Dashboard
    const loginLink = await stripe.accounts.createLoginLink(organization.stripe_account_id)

    console.log('[AGENCY_DASHBOARD] ✅ Login link created successfully:', {
      stripeAccountId: organization.stripe_account_id,
      url: loginLink.url,
    })

    return res.status(200).json({
      url: loginLink.url,
      success: true,
    })
  } catch (error) {
    console.error('[AGENCY_DASHBOARD] ❌ Error creating dashboard link:', error)

    // Handle Stripe-specific errors
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ 
        error: 'Invalid Stripe account',
        message: 'The connected Stripe account is invalid. Please reconnect to the Agency Program.' 
      })
    }

    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to create agency dashboard link. Please try again.' 
    })
  }
}

