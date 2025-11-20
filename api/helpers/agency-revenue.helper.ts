import { Organization } from '../repository/organization.repository'

/**
 * Default platform revenue share percentage if not set in organization
 * Platform keeps 50%, Agency gets 50%
 */
export const DEFAULT_REVENUE_SHARE_PERCENT = 50

/**
 * Get the platform's revenue share percentage for an organization
 * 
 * @param organization - Organization object (can be null/undefined)
 * @returns Platform's revenue share percentage (0-100)
 * 
 * @example
 * const org = { agency_revenue_share_percent: 40 }
 * getAgencyRevenueSharePercent(org) // Returns 40 (platform keeps 40%)
 * 
 * getAgencyRevenueSharePercent(null) // Returns 50 (default)
 */
export function getAgencyRevenueSharePercent(organization: Organization | null | undefined): number {
  // If organization doesn't exist or doesn't have the field set, use default
  if (!organization || organization.agency_revenue_share_percent == null) {
    return DEFAULT_REVENUE_SHARE_PERCENT
  }

  // Ensure the value is within valid range (0-100)
  const percent = organization.agency_revenue_share_percent
  
  if (percent < 0) return 0
  if (percent > 100) return 100
  
  return percent
}

/**
 * Calculate the agency's share percentage
 * 
 * @param organization - Organization object
 * @returns Agency's revenue share percentage (0-100)
 * 
 * @example
 * const org = { agency_revenue_share_percent: 40 }
 * getAgencySharePercent(org) // Returns 60 (agency gets 60%)
 */
export function getAgencySharePercent(organization: Organization | null | undefined): number {
  const platformPercent = getAgencyRevenueSharePercent(organization)
  return 100 - platformPercent
}

