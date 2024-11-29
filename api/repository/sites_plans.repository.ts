import Knex from 'knex';
import database from '~/config/database.config';
import { TABLES } from '~/constants/database.constant';
import formatDateDB from '~/utils/format-date-db';
import { priceColumns } from './prices.repository';
import { productColumns } from './products.repository';
import { siteColumns } from './sites_allowed.repository';

const TABLE = TABLES.sitesPlans;

export type SitesPlanData = {
  id?: number;
  allowed_site_id?: number;
  product_id?: number;
  price_id?: number;
  subcription_id?: string;
  customer_id?: string;
  is_trial?: boolean;
  expired_at?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
};

export const sitesPlansColumns = {
  id: 'sites_plans.id',
  siteId: 'sites_plans.allowed_site_id',
  productId: 'sites_plans.product_id',
  priceId: 'sites_plans.price_id',
  subcriptionId: 'sites_plans.subcription_id',
  customerId: 'sites_plans.customer_id',
  isTrial: 'sites_plans.is_trial',
  expiredAt: 'sites_plans.expired_at',
  isActive: 'sites_plans.is_active',
  createAt: 'sites_plans.created_at',
  updatedAt: 'sites_plans.updated_at',
  deletedAt: 'sites_plans.deleted_at',
};

export function getSitesPlanByUserId(userId: number) {
  return database(TABLE)
    .leftJoin(TABLES.allowed_sites, sitesPlansColumns.siteId, 'allowed_sites.id')
    .select(sitesPlansColumns, 'allowed_sites.url as siteName')
    .where({ [siteColumns.user_id]: userId, [sitesPlansColumns.isActive]: true })
    .where(sitesPlansColumns.expiredAt, '>=', formatDateDB());
}

export function getSitesPlanByCustomerIdAndSubscriptionId(customerId: string, subscriptionId:string) {
  return database(TABLE)
    .select(sitesPlansColumns)
    .where({ [sitesPlansColumns.customerId]: customerId, [sitesPlansColumns.isActive]: true, [sitesPlansColumns.subcriptionId]:subscriptionId })
    .where(sitesPlansColumns.expiredAt, '>=', formatDateDB());
}

export function getActiveSitesPlan() {
  return database(TABLE)
    .select(sitesPlansColumns)
    .whereNot({[sitesPlansColumns.subcriptionId]: "Trial"})
    .where({ [sitesPlansColumns.isActive]: true})
    .where(sitesPlansColumns.expiredAt, '>=', formatDateDB());
}

export function insertSitePlan(data: SitesPlanData, transaction: Knex.Transaction = null): Promise<number[]> {
  const query = database(TABLE).insert(data);
  if (!transaction) {
    return query;
  }
  return query.transacting(transaction);
}

export function getSitePlanById(id: number): Promise<SitesPlanData> {
  return database(TABLE)
    .where({ id, [sitesPlansColumns.isActive]: true })
    .where(sitesPlansColumns.expiredAt, '>=', formatDateDB())
    .first();
}

export function updateSitePlanById(id: number, data: SitesPlanData): Promise<number> {
  return database(TABLE).where({ id }).update(data);
}

export function getSitePlanBySiteId(siteId: number) {
  return database(TABLE)
    .leftJoin(TABLES.allowed_sites, sitesPlansColumns.siteId, siteColumns.id)
    .leftJoin(TABLES.products, sitesPlansColumns.productId, productColumns.id)
    .leftJoin(TABLES.prices, sitesPlansColumns.priceId, priceColumns.id)
    .select(
      sitesPlansColumns,
      `${siteColumns.url} as siteName`,
      productColumns.name,
      `${productColumns.type} as productType`,
      priceColumns.amount,
      `${priceColumns.type} as priceType`,
      `${sitesPlansColumns.isActive} as is_active`,  // Change this line
    )
    .where({ [sitesPlansColumns.siteId]: siteId, [sitesPlansColumns.isActive]: true })
    .where(sitesPlansColumns.expiredAt, '>=', formatDateDB())
    .first();
}

export function deleteSitesPlanById(id: number): Promise<number> {
  return database(TABLE).where({ id }).update({ [sitesPlansColumns.deletedAt]: formatDateDB() });
}

export function deleteSitePlanById(id: number): Promise<number> {
  return database(TABLE).where({ id }).del();
}