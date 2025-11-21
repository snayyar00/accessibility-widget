import dayjs from 'dayjs'

import { getAgencyRevenueSharePercent } from '../../helpers/agency-revenue.helper'
import { getOrganizationById } from '../../repository/organization.repository'
import { findProductAndPriceByType, FindProductAndPriceByTypeResponse } from '../../repository/products.repository'
import { findSiteByUserIdAndSiteId } from '../../repository/sites_allowed.repository'
import { deleteSitePlanById, getAnySitePlanById, getSitePlanById, getSitePlanBySiteId, insertSitePlan, SitesPlanData, updateSitePlanById } from '../../repository/sites_plans.repository'
import { findUser } from '../../repository/user.repository'
import formatDateDB from '../../utils/format-date-db'
import { ApolloError, ValidationError } from '../../utils/graphql-errors.helper'
import logger from '../../utils/logger'
import { validateGetPlanBySiteIdAndUserId, validateUpdateSitesPlan } from '../../validations/planSites.validation'
import { cancelSubcriptionBySubId, createNewSubcription, updateSubcription } from '../stripe/subcription.service'

// Add this interface definition
export interface ResponseSitesPlan {
  id: number
  allowedSiteId: number
  productId: number
  priceId: number
  name: string
  amount: number
  productType: string
  priceType: string
  expiredAt?: Date
  deletedAt?: Date
  isActive: boolean
}

export async function getPlanBySiteIdAndUserId(userId: number, siteId: number, organizationId?: number) {
  const validateResult = await validateGetPlanBySiteIdAndUserId({ userId, siteId })

  if (Array.isArray(validateResult) && validateResult.length) {
    throw new ValidationError(validateResult.map((it) => it.message).join(','))
  }

  const site = await findSiteByUserIdAndSiteId(userId, siteId)

  if (!site) {
    logger.warn(`Site not found for userId: ${userId}, siteId: ${siteId}`)
    throw new ApolloError('Can not find any site')
  }

  // Check organization_id if provided
  if (organizationId && site.organization_id !== organizationId) {
    logger.warn(`Organization mismatch for userId: ${userId}, siteId: ${siteId}, expected: ${organizationId}, got: ${site.organization_id}`)
    throw new ApolloError('Site does not belong to current organization')
  }

  const plan = await getSitePlanBySiteId(site.id)
  if (!plan) {
    logger.warn(`No plan found for site: ${site.id}`)
    return null
  }

  const result = {
    ...plan,
    isActive: Boolean(plan.isActive || plan.is_active),
    isTrial: Boolean(plan.isTrial || plan.is_trial),
  }

  logger.info('Processed plan data', { planId: result.id, isActive: result.isActive, isTrial: result.isTrial })
  return result
}

export async function createSitesPlan(userId: number, paymentMethodToken: string, planName: string, billingType: 'MONTHLY' | 'YEARLY', siteId: number, couponCode: string, organizationId?: number): Promise<true> {
  try {
    logger.info(`[createSitesPlan] Starting plan creation`, { userId, siteId, planName, billingType, paymentMethodToken })
    
    // Retry site lookup to handle potential replication lag in production
    let site = null
    let retries = 3
    while (!site && retries > 0) {
      site = await findSiteByUserIdAndSiteId(userId, siteId)
      if (!site && retries > 1) {
        logger.warn(`[createSitesPlan] Site not found, retrying... (${retries - 1} retries left)`, { userId, siteId })
        await new Promise((resolve) => setTimeout(resolve, 100 * (4 - retries))) // Exponential backoff: 100ms, 200ms, 300ms
      }
      retries--
    }
    
    const [user, product, sitePlan] = await Promise.all([findUser({ id: userId }), findProductAndPriceByType(planName, billingType), getSitePlanBySiteId(siteId).catch((): null => null)])
    
    logger.info(`[createSitesPlan] Fetched data`, { 
      userFound: !!user, 
      siteFound: !!site, 
      productFound: !!product, 
      existingPlanFound: !!sitePlan 
    })

    const coupon = couponCode || ''

    if (!user) {
      throw new ApolloError('Can not find any user')
    }
    if (!site) {
      throw new ApolloError('Can not find any site')
    }

    // Check organization_id if provided (skip for webhook/system calls)
    if (organizationId && site.organization_id !== organizationId) {
      logger.warn(`Organization mismatch in createSitesPlan for userId: ${userId}, siteId: ${siteId}, expected: ${organizationId}, got: ${site.organization_id}`)
      throw new ApolloError('Site does not belong to current organization')
    }

    if (!product) {
      logger.error(`[createSitesPlan] Product not found`, { planName, billingType })
      throw new ApolloError(`Can not find any plan: ${planName} (${billingType})`)
    }

    if (sitePlan) {
      await Promise.all([updateSitePlanById(sitePlan.id, { is_active: false })])
    }

    // Fetch organization's stripe_account_id and revenue share % for Agency Program
    let agencyAccountId: string | null = null
    let revenueSharePercent = 50 // Default
    
    if (user.current_organization_id) {
      try {
        const organization = await getOrganizationById(user.current_organization_id)
        revenueSharePercent = getAgencyRevenueSharePercent(organization)
        
        if (organization?.stripe_account_id) {
          agencyAccountId = organization.stripe_account_id
          console.log(`[AGENCY_PROGRAM] Site plan will include revenue sharing: Platform ${revenueSharePercent}% | Agency ${100 - revenueSharePercent}%`, {
            agencyAccountId,
          })
        }
      } catch (error) {
        console.error('[AGENCY_PROGRAM] Failed to fetch organization stripe_account_id:', error)
      }
    }

    console.log('[REWARDFUL] Creating site plan with referral code:', user.referral || 'none')
    logger.info(`[createSitesPlan] Creating Stripe subscription`, { 
      priceStripeId: product.price_stripe_id, 
      isTrial: paymentMethodToken === 'Trial',
      email: user.email 
    })
    
    const { subcription_id, customer_id } = await createNewSubcription(paymentMethodToken, user.email, user.name, product.price_stripe_id, paymentMethodToken === 'Trial', coupon, user.referral || '', agencyAccountId, revenueSharePercent)
    
    if (!subcription_id || !customer_id) {
      logger.error(`[createSitesPlan] Stripe subscription creation returned null values`, { subcription_id, customer_id })
      throw new ApolloError('Failed to create Stripe subscription - missing subscription_id or customer_id')
    }
    
    logger.info(`[createSitesPlan] Stripe subscription created`, { subcription_id, customer_id })
    
    if (subcription_id && customer_id) {
      const INFINITE_TIMESTAMP = '9999-12-31 23:59:59'
      let expiry = formatDateDB(dayjs().add(paymentMethodToken === 'Trial' ? 15 : 1, paymentMethodToken === 'Trial' ? 'day' : product.price_type === 'yearly' ? 'y' : 'M'))

      if (couponCode !== '') {
        // never expires
        expiry = INFINITE_TIMESTAMP
      }
      const dataUserPlan = {
        allowed_site_id: siteId,
        product_id: product.id,
        price_id: product.price_id,
        customer_id,
        subcription_id,
        is_trial: paymentMethodToken === 'Trial' ? 1 : 0,
        expired_at: expiry,
      }

      // Safety check: recompute expired_at if it's null (15 days from current date for trials)
      if (!dataUserPlan.expired_at || dataUserPlan.expired_at === null) {
        logger.warn('[createSitesPlan] expired_at is null, recomputing to 15 days from now', { 
          originalExpiry: expiry, 
          siteId, 
          isTrial: dataUserPlan.is_trial 
        })
        dataUserPlan.expired_at = formatDateDB(dayjs().add(15, 'day'))
        console.log('[createSitesPlan] Recomputed expired_at:', dataUserPlan.expired_at)
      }

      console.log('[createSitesPlan] Site plan object to be saved to database:', JSON.stringify(dataUserPlan, null, 2))
      logger.info('[createSitesPlan] Site plan object to be saved', dataUserPlan)

      await insertSitePlan(dataUserPlan as any)
    }
    return true
  } catch (error) {
    console.log('error = ', error)
    logger.error(error)
    throw new ApolloError('Something went wrong!')
  }
}

export async function updateSitesPlan(userId: number, sitePlanId: number, planName: string, billingType: 'MONTHLY' | 'YEARLY', hook = false, organizationId?: number): Promise<true> {
  try {
    const validateResult = await validateUpdateSitesPlan({
      userId,
      sitePlanId,
      planName,
      billingType,
      hook,
    })

    if (Array.isArray(validateResult) && validateResult.length) {
      throw new ValidationError(validateResult.map((it) => it.message).join(','))
    }

    const sitePlan = await getSitePlanById(sitePlanId)

    if (!sitePlan) {
      throw new ApolloError('Can not find any user plan')
    }

    const site = await findSiteByUserIdAndSiteId(userId, sitePlan.allowed_site_id)

    if (!site) {
      throw new ApolloError('Can not find any site')
    }

    // Check organization_id if provided
    if (organizationId && site.organization_id !== organizationId) {
      logger.warn(`Organization mismatch for userId: ${userId}, sitePlanId: ${sitePlanId}, expected: ${organizationId}, got: ${site.organization_id}`)
      throw new ApolloError('Site does not belong to current organization')
    }

    const product: FindProductAndPriceByTypeResponse = await findProductAndPriceByType(planName, billingType)

    if (!product) {
      logger.error(`[updateSitesPlan] Product not found`, { planName, billingType })
      throw new ApolloError(`Can not find any plan: ${planName} (${billingType})`)
    }

    if (hook === false) {
      await updateSubcription(sitePlan.subcription_id, product.price_stripe_id)
    }

    const dataSitePlan: SitesPlanData = {
      product_id: product.id,
      price_id: product.price_id,
    }
    if (!sitePlan.is_trial) {
      dataSitePlan.expired_at = formatDateDB(dayjs().add(1, product.price_type === 'yearly' ? 'y' : 'M'))
    }

    await updateSitePlanById(sitePlanId, dataSitePlan)

    return true
  } catch (error) {
    logger.error(error)
    throw new ApolloError(error.message)
  }
}

export async function deleteTrialPlan(id: number): Promise<true> {
  try {
    const sitePlan = await getSitePlanById(id)

    if (!sitePlan) {
      throw new ApolloError('Can not find any trial user plan')
    }

    await deleteSitePlanById(sitePlan.id)

    return true
  } catch (error) {
    console.log('This is error', error)
    logger.error(error)
    throw new ApolloError('Something went wrong!')
  }
}

export async function deleteSitesPlan(id: number, hook = false): Promise<true> {
  try {
    let sitePlan = await getSitePlanById(id)

    if (!sitePlan) {
      sitePlan = await getAnySitePlanById(id)
    }

    if (!sitePlan) {
      throw new ApolloError('Can not find any user plan')
    }

    if (hook === false) {
      try {
        await cancelSubcriptionBySubId(sitePlan.subcription_id)
      } catch (error: any) {
        if (error.message && error.message.includes('No such subscription')) {
          console.log(`Subscription ${sitePlan.subcription_id} not found, skipping cancellation`)
        } else {
          console.log('Subscription cancel error = ', error)
          throw error
        }
      }
    }

    try {
      await deleteSitePlanById(sitePlan.id)
    } catch (error) {
      console.log('Error Deleting Plan for site:', sitePlan.allowed_site_id)
      throw error
    }

    return true
  } catch (error) {
    console.log('This is error', error)
    logger.error(error)
    throw new ApolloError('Something went wrong!')
  }
}

export async function deleteExpiredSitesPlan(id: number, hook = false): Promise<true> {
  try {
    const sitePlan = await getAnySitePlanById(id)

    if (!sitePlan) {
      throw new ApolloError('Can not find any user plan')
    }

    if (hook === false) {
      try {
        await cancelSubcriptionBySubId(sitePlan.subcription_id)
      } catch (error: any) {
        if (error.message && error.message.includes('No such subscription')) {
          console.log(`Subscription ${sitePlan.subcription_id} not found, skipping cancellation`)
        } else {
          console.log('Subscription cancel error = ', error)
          throw error
        }
      }
    }

    try {
      await deleteSitePlanById(sitePlan.id)
    } catch (error) {
      console.log('Error Deleting Plan for site:', sitePlan.allowed_site_id)
      throw error
    }

    return true
  } catch (error) {
    console.log('This is error', error)
    logger.error(error)
    throw new ApolloError('Something went wrong!')
  }
}
