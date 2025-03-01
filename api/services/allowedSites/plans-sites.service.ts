import { ApolloError } from 'apollo-server-express';
import dayjs from 'dayjs';

import logger from '~/utils/logger';
import { cancelSubcription, createNewSubcription, updateSubcription, DataSubcription, cancelSubcriptionBySubId, getSubcriptionCustomerIDBySubId } from '~/services/stripe/subcription.service';
import { findProductAndPriceByType, FindProductAndPriceByTypeResponse } from '~/repository/products.repository';
import { deletePermissionByUserPlanId, insertMultiPermission } from '~/repository/user_permission.repository';
import { findUser } from '~/repository/user.repository';
import formatDateDB from '~/utils/format-date-db';
import { PERMISSION_SITE_PLAN } from '~/constants/billing.constant';
import compileEmailTemplate from '~/helpers/compile-email-template';
import {sendMail} from '~/libs/mail';
import { FindAllowedSitesProps, deleteSiteByURL, findSiteById, findSiteByUserIdAndSiteId } from '~/repository/sites_allowed.repository';
import { SitesPlanData, deleteSitePlanById, deleteSitesPlanById, getSitePlanById, getSitePlanBySiteId, getSitesPlanByCustomerIdAndSubscriptionId, getSitesPlanByUserId, insertSitePlan, updateSitePlanById } from '~/repository/sites_plans.repository';
import { deletePermissionBySitePlanId, insertMultiSitePermission } from '~/repository/sites_permission.repository';
import { Token } from '../authentication/login.service';
import database from '~/config/database.config';
import { TABLES } from '~/constants/database.constant';

const TABLE = TABLES.sitesPlans;

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

export async function getUserSitesPlan(userId: number): Promise<ResponseSitesPlan[]> {
  const sitePlans = await database(TABLE)
    .where({ user_id: userId, is_active: true })
    .select('*');
  
  if (sitePlans.length === 0) {
    throw new ApolloError('No active plans found for the user');
  }

  // Map database results to ResponseSitesPlan
  return sitePlans.map(plan => ({
    id: plan.id,
    allowedSiteId: plan.allowed_site_id,
    productId: plan.product_id,
    priceId: plan.price_id,
    name: plan.name,
    amount: plan.amount,
    productType: plan.product_type,
    priceType: plan.price_type,
    expiredAt: plan.expired_at,
    deletedAt: plan.deleted_at,
    isActive: plan.is_active,
  }));
}

export async function getPlanBySiteIdAndUserId(userId: number, siteId: number) {
  // console.log(`getPlanBySiteIdAndUserId called with userId: ${userId}, siteId: ${siteId}`);

  const site = await findSiteByUserIdAndSiteId(userId, siteId);

  if (!site) {
    console.log(`Site not found for userId: ${userId}, siteId: ${siteId}`);
    throw new ApolloError('Can not find any site');
  }

  // console.log('Site found:', JSON.stringify(site, null, 2));

  const plan = await getSitePlanBySiteId(site.id);
  
  // console.log('Raw plan data:', JSON.stringify(plan, null, 2));

  if (!plan) {
    console.log(`No plan found for site: ${site.id}`);
    return null;
  }

  const result = {
    ...plan,
    isActive: Boolean(plan.isActive || plan.is_active),
    isTrial: Boolean(plan.isTrial || plan.is_trial)
  };

  console.log('Processed plan data:', JSON.stringify(result, null, 2));
  return result;
}

export async function createSitesPlan(
  userId: number,
  paymentMethodToken: string,
  planName: string,
  billingType: 'MONTHLY' | 'YEARLY',
  siteId: number,
  couponCode: string
): Promise<true> {
  try {
    const user = await findUser({ id: userId });
    let coupon = "";
    if (couponCode) {
      coupon = couponCode;
    }
    if (!user) {
      throw new ApolloError('Can not find any user');
    }

    const site = await findSiteByUserIdAndSiteId(userId, siteId);
    if (!site) {
      throw new ApolloError('Can not find any site');
    }
    
    const product: FindProductAndPriceByTypeResponse = await findProductAndPriceByType(planName, billingType);
    if (!product) {
      throw new ApolloError('Can not find any plan');
    }

    const sitePlan = await getSitePlanBySiteId(siteId);
    if (sitePlan) {
      await updateSitePlanById(sitePlan.id, { is_active: false });
      await deletePermissionBySitePlanId(sitePlan.id);
    }

    const { subcription_id, customer_id } = await createNewSubcription(
      paymentMethodToken,
      user.email,
      user.name,
      product.price_stripe_id,
      paymentMethodToken === "Trial",
      coupon
    );
    if (subcription_id && customer_id) {
      const dataUserPlan = {
        allowed_site_id: siteId,
        product_id: product.id,
        price_id: product.price_id,
        customer_id,
        subcription_id,
        is_trial: paymentMethodToken === "Trial" ? 1 : 0,
        expired_at: formatDateDB(
          dayjs().add(
            paymentMethodToken === "Trial" ? 15 : 1,
            paymentMethodToken === "Trial"
              ? 'day'
              : product.price_type === 'yearly'
              ? 'y'
              : 'M'
          )
        ),
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
    console.log("error = ", error);
    logger.error(error);
    throw new ApolloError('Something went wrong!');
  }
}

export async function updateSitesPlan(
  sitePlanId: number,
  planName: string,
  billingType: 'MONTHLY' | 'YEARLY',
  hook = false
): Promise<true> {
  try {
    const sitePlan = await getSitePlanById(sitePlanId);
    if (!sitePlan) {
      throw new ApolloError('Can not find any user plan');
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
      throw new ApolloError('Can not find any user plan');
    }
    await deleteSitePlanById(sitePlan.id);
    // await Promise.all([deleteSitePlanById(sitePlan.id), deletePermissionBySitePlanId(sitePlan.id)]);

    return true;
  } catch (error) {
    console.log("This is error", error);
    logger.error(error);
    throw new ApolloError('Something went wrong!');
  }
}

export async function deleteSitesPlan(id: number, hook = false): Promise<true> {
  try {
    const sitePlan = await getSitePlanById(id);

    if (!sitePlan) {
      throw new ApolloError('Can not find any user plan');
    }

    const customer = await getSubcriptionCustomerIDBySubId(sitePlan.subcription_id);

    if (hook === false) {
      await cancelSubcriptionBySubId(sitePlan.subcription_id);
    }

    let previous_plan;
    try {
      previous_plan = await getSitesPlanByCustomerIdAndSubscriptionId(customer, sitePlan.subcription_id);
    } catch (error) {
      console.log('err = ', error);
    }

    const updatePromises = previous_plan.map(async (plan) => {
      try {
        // await deleteSitesPlan(plan.id, true);
        await Promise.all([deleteSitePlanById(plan.id), deletePermissionBySitePlanId(plan.id)]);
        console.log('Deleted Plan for site', plan.siteId);
      } catch (error) {
        console.log('Error Deleting Plan for site:', plan.siteId);
        throw error;
      }
    });

    await Promise.all(updatePromises);
    // await deleteSitesPlanById(sitePlan.id);
    // await Promise.all([deleteSitePlanById(sitePlan.id), deletePermissionBySitePlanId(sitePlan.id)]);

    return true;
  } catch (error) {
    console.log("This is error", error);
    logger.error(error);
    throw new ApolloError('Something went wrong!');
  }
}

// export async function invoicePaymentSuccess(data: DataSubcription): Promise<boolean> {
//   try {
//     const userPlan = await getUserPlanByCustomerId(data.customer);
//     if (!userPlan) {
//       throw new ApolloError('Can not find any user plan');
//     }

//     const expiredAt = formatDateDB(dayjs().add(1, userPlan.priceType === 'yearly' ? 'y' : 'M'));
//     const dataUserPlan: UserPlanData = {
//       expired_at: expiredAt,
//       deleted_at: null,
//     };

//     await updateUserPlanById(userPlan.id, dataUserPlan);

//     const user = await findUser({ id: userPlan.userId });
//     if (user) {
//       const template = await compileEmailTemplate({
//         fileName: 'invoicePaymentSuccess.mjml',
//         data: {
//           link: data.hosted_invoice_url,
//           name: user.name,
//           date: expiredAt,
//         },
//       });

//       sendMail(user.email, 'Invoice payment successfully', template);
//     }

//     return true;
//   } catch (error) {
//     logger.error(error);
//     throw new ApolloError('Something went wrong!');
//   }
// }

// export async function invoicePaymentFailed(data: DataSubcription): Promise<boolean> {
//   try {
//     const userPlan = await getUserPlanByCustomerId(data.customer);
//     if (!userPlan) {
//       throw new ApolloError('Can not find any user plan');
//     }

//     const expiredAt = formatDateDB(dayjs(userPlan.expiredAt).add(10, 'd'));
//     const dataUserPlan = {
//       expired_at: expiredAt,
//       deleted_at: formatDateDB(),
//     };

//     await updateUserPlanById(userPlan.id, dataUserPlan);

//     const user = await findUser({ id: userPlan.userId });
//     if (user) {
//       const template = await compileEmailTemplate({
//         fileName: 'invoicePaymentFailed.mjml',
//         data: {
//           name: user.name,
//           date: expiredAt,
//         },
//       });

//       sendMail(user.email, 'Invoice payment failed', template);
//     }
//     return true;
//   } catch (error) {
//     logger.error(error);
//     throw new ApolloError('Something went wrong!');
//   }
// }

// export async function trialWillEnd(data: DataSubcription): Promise<boolean> {
//   try {
//     const userPlan = await getUserPlanByCustomerId(data.customer);
//     if (!userPlan) {
//       throw new ApolloError('Can not find any user plan');
//     }

//     const user = await findUser({ id: userPlan.userId });
//     if (user) {
//       const template = await compileEmailTemplate({
//         fileName: 'trialWillEnd.mjml',
//         data: {
//           name: user.name,
//           date: formatDateDB(dayjs(data.trial_end * 1000)),
//         },
//       });

//       sendMail(user.email, 'Trial will end', template);
//     }
//     return true;
//   } catch (error) {
//     logger.error(error);
//     throw new ApolloError('Something went wrong!');
//   }
// }
