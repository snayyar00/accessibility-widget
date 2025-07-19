import { ApolloError, ValidationError } from 'apollo-server-express';
import dayjs from 'dayjs';
import { validateGetPlanBySiteIdAndUserId, validateUpdateSitesPlan } from '../../validations/planSites.validation';

import logger from '../../config/logger.config';
import { createNewSubcription, updateSubcription, cancelSubcriptionBySubId } from "../stripe/subcription.service";
import { findProductAndPriceByType, FindProductAndPriceByTypeResponse } from '../../repository/products.repository';
import { findUser } from '../../repository/user.repository';
import formatDateDB from '../../utils/format-date-db';
import { PERMISSION_SITE_PLAN } from '../../constants/billing.constant';
import { findSiteByUserIdAndSiteId } from '../../repository/sites_allowed.repository';
import { SitesPlanData, deleteSitePlanById, getAnySitePlanById, getSitePlanById, getSitePlanBySiteId, insertSitePlan, updateSitePlanById } from '../../repository/sites_plans.repository';
import { deletePermissionBySitePlanId, insertMultiSitePermission } from '../../repository/sites_permission.repository';

// Add this interface definition
export interface ResponseSitesPlan {
  id: number;
  allowedSiteId: number;
  productId: number;
  priceId: number;
  name: string;
  amount: number;
  productType: string;
  priceType: string;
  expiredAt?: Date;
  deletedAt?: Date;
  isActive: boolean;
}

export async function getPlanBySiteIdAndUserId(userId: number, siteId: number) {
  const validateResult = await validateGetPlanBySiteIdAndUserId({ userId, siteId });

  if (Array.isArray(validateResult) && validateResult.length) {
    throw new ValidationError(validateResult.map((it) => it.message).join(','));
  }

  const site = await findSiteByUserIdAndSiteId(userId, siteId);

  if (!site) {
    logger.warn(`Site not found for userId: ${userId}, siteId: ${siteId}`);
    throw new ApolloError('Can not find any site');
  }

  const plan = await getSitePlanBySiteId(site.id);
  if (!plan) {
    logger.warn(`No plan found for site: ${site.id}`);
    return null;
  }

  const result = {
    ...plan,
    isActive: Boolean(plan.isActive || plan.is_active),
    isTrial: Boolean(plan.isTrial || plan.is_trial),
  };

  logger.info('Processed plan data', { planId: result.id, isActive: result.isActive, isTrial: result.isTrial });
  return result;
}

export async function createSitesPlan(userId: number, paymentMethodToken: string, planName: string, billingType: 'MONTHLY' | 'YEARLY', siteId: number, couponCode: string): Promise<true> {
  try {
    const [user, site, product, sitePlan] = await Promise.all([findUser({ id: userId }), findSiteByUserIdAndSiteId(userId, siteId), findProductAndPriceByType(planName, billingType), getSitePlanBySiteId(siteId).catch((): null => null)]);

    const coupon = couponCode || '';

    if (!user) {
      throw new ApolloError('Can not find any user');
    }
    if (!site) {
      throw new ApolloError('Can not find any site');
    }
    if (!product) {
      throw new ApolloError('Can not find any plan');
    }

    if (sitePlan) {
      await Promise.all([updateSitePlanById(sitePlan.id, { is_active: false }), deletePermissionBySitePlanId(sitePlan.id)]);
    }

    const { subcription_id, customer_id } = await createNewSubcription(paymentMethodToken, user.email, user.name, product.price_stripe_id, paymentMethodToken === 'Trial', coupon);
    if (subcription_id && customer_id) {
      const INFINITE_TIMESTAMP = '9999-12-31 23:59:59';
      let expiry = formatDateDB(dayjs().add(paymentMethodToken === 'Trial' ? 15 : 1, paymentMethodToken === 'Trial' ? 'day' : product.price_type === 'yearly' ? 'y' : 'M'));

      if (couponCode !== '') {
        // never expires
        expiry = INFINITE_TIMESTAMP;
      }
      const dataUserPlan = {
        allowed_site_id: siteId,
        product_id: product.id,
        price_id: product.price_id,
        customer_id,
        subcription_id,
        is_trial: paymentMethodToken === 'Trial' ? 1 : 0,
        expired_at: expiry,
      };
      const sitePlanId = await insertSitePlan(dataUserPlan as any);
      let sitePermissionData;

      if (product.type === 'small' || product.type === 'medium' || product.type === 'large') {
        sitePermissionData = PERMISSION_SITE_PLAN[product.type as keyof typeof PERMISSION_SITE_PLAN].map((permission: string) => ({
          allowed_site_id: siteId,
          sites_plan_id: sitePlanId[0],
          permission,
        }));
      }
      await insertMultiSitePermission(sitePermissionData);
    }
    return true;
  } catch (error) {
    console.log('error = ', error);
    logger.error(error);
    throw new ApolloError('Something went wrong!');
  }
}

export async function updateSitesPlan(userId: number, sitePlanId: number, planName: string, billingType: 'MONTHLY' | 'YEARLY', hook = false): Promise<true> {
  try {
    const validateResult = await validateUpdateSitesPlan({
      userId,
      sitePlanId,
      planName,
      billingType,
      hook,
    });

    if (Array.isArray(validateResult) && validateResult.length) {
      throw new ValidationError(validateResult.map((it) => it.message).join(','));
    }

    const sitePlan = await getSitePlanById(sitePlanId);

    if (!sitePlan) {
      throw new ApolloError('Can not find any user plan');
    }

    const site = await findSiteByUserIdAndSiteId(userId, sitePlan.allowed_site_id);

    if (!site) {
      throw new ApolloError('Can not find any site');
    }

    const product: FindProductAndPriceByTypeResponse = await findProductAndPriceByType(planName, billingType);

    if (!product) {
      throw new ApolloError('Can not find any plan');
    }

    if (hook === false) {
      await updateSubcription(sitePlan.subcription_id, product.price_stripe_id);
    }

    const dataSitePlan: SitesPlanData = {
      product_id: product.id,
      price_id: product.price_id,
    };
    if (!sitePlan.is_trial) {
      dataSitePlan.expired_at = formatDateDB(dayjs().add(1, product.price_type === 'yearly' ? 'y' : 'M'));
    }

    await updateSitePlanById(sitePlanId, dataSitePlan);
    let sitePermissionData;

    if (product.type === 'small' || product.type === 'medium' || product.type === 'large') {
      sitePermissionData = PERMISSION_SITE_PLAN[product.type as keyof typeof PERMISSION_SITE_PLAN].map((permission: string) => ({
        allowed_site_id: sitePlan.allowed_site_id,
        sites_plan_id: sitePlanId,
        permission,
      }));
    }
    await deletePermissionBySitePlanId(sitePlanId);
    await insertMultiSitePermission(sitePermissionData);
    return true;
  } catch (error) {
    logger.error(error);
    throw new ApolloError(error.message);
  }
}

export async function deleteTrialPlan(id: number): Promise<true> {
  try {
    const sitePlan = await getSitePlanById(id);

    if (!sitePlan) {
      throw new ApolloError('Can not find any trial user plan');
    }

    await deleteSitePlanById(sitePlan.id);

    return true;
  } catch (error) {
    console.log('This is error', error);
    logger.error(error);
    throw new ApolloError('Something went wrong!');
  }
}

export async function deleteSitesPlan(id: number, hook = false): Promise<true> {
  try {
    let sitePlan = await getSitePlanById(id);

    if (!sitePlan) {
      sitePlan = await getAnySitePlanById(id);
    }

    if (!sitePlan) {
      throw new ApolloError('Can not find any user plan');
    }

    if (hook === false) {
      try {
        await cancelSubcriptionBySubId(sitePlan.subcription_id);
      } catch (error: any) {
        if (error.message && error.message.includes('No such subscription')) {
          console.log(`Subscription ${sitePlan.subcription_id} not found, skipping cancellation`);
        } else {
          console.log('Subscription cancel error = ', error);
          throw error;
        }
      }
    }

    try {
      await Promise.all([deleteSitePlanById(sitePlan.id), deletePermissionBySitePlanId(sitePlan.id)]);
    } catch (error) {
      console.log('Error Deleting Plan for site:', sitePlan.allowed_site_id);
      throw error;
    }

    return true;
  } catch (error) {
    console.log('This is error', error);
    logger.error(error);
    throw new ApolloError('Something went wrong!');
  }
}

export async function deleteExpiredSitesPlan(id: number, hook = false): Promise<true> {
  try {
    const sitePlan = await getAnySitePlanById(id);

    if (!sitePlan) {
      throw new ApolloError('Can not find any user plan');
    }

    if (hook === false) {
      try {
        await cancelSubcriptionBySubId(sitePlan.subcription_id);
      } catch (error: any) {
        if (error.message && error.message.includes('No such subscription')) {
          console.log(`Subscription ${sitePlan.subcription_id} not found, skipping cancellation`);
        } else {
          console.log('Subscription cancel error = ', error);
          throw error;
        }
      }
    }

    try {
      await Promise.all([deleteSitePlanById(sitePlan.id), deletePermissionBySitePlanId(sitePlan.id)]);
    } catch (error) {
      console.log('Error Deleting Plan for site:', sitePlan.allowed_site_id);
      throw error;
    }

    return true;
  } catch (error) {
    console.log('This is error', error);
    logger.error(error);
    throw new ApolloError('Something went wrong!');
  }
}
