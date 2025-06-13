import database from '~/config/database.config';
import { TABLES } from '~/constants/database.constant';
import { findUser } from './user.repository';
import { AddTokenToDB, RemoveTokenFromDB, UpdateWebsiteURL } from '~/services/webToken/mongoVisitors';
import { sitesPlansColumns } from './sites_plans.repository';

const TABLE = TABLES.allowed_sites;

export const siteColumns = {
	id: 'allowed_sites.id',
	user_id: 'allowed_sites.user_id',
	url: 'allowed_sites.url',
	createAt: 'allowed_sites.created_at',
	updatedAt: 'allowed_sites.updated_at',

};

export type FindAllowedSitesProps = {
	id?: number;
	user_id?: number
	url?: string,
	createAt?: string,
	updatedAt?: string,
};

export interface IUserSites extends FindAllowedSitesProps {
	expiredAt?: string | null | undefined,
	trial?:number|null|undefined
}

export type allowedSites = {
	id?: number;
	user_id?: number
	url?: string,
};

export async function findSitesByUserId(id: number): Promise<IUserSites[]> {
	return database(TABLE)
		.where({ [siteColumns.user_id]: id });
}

export async function findSiteById(id: number): Promise<IUserSites[]> {
	return database(TABLE)
		.where({ [siteColumns.id]: id }).first();
}

export async function findSiteByURL(url: string): Promise<FindAllowedSitesProps> {
	const result = await database(TABLE)
		.select(siteColumns)
		.where({ [siteColumns.url]: url })
		.first();
	return result;
}

export async function findSiteByUserIdAndSiteId(user_id: number, site_id: number): Promise<FindAllowedSitesProps> {
	return database(TABLE)
		.select(siteColumns)
		.where({ [siteColumns.user_id]: user_id, [siteColumns.id]: site_id })
		.first();
}

export async function insertSite(data: allowedSites): Promise<string> {

	const exisitingSites = await database(TABLE).select(siteColumns).where({ [siteColumns.url]: data.url }).first();
	if (exisitingSites !== undefined) return 'You have already added this site.';

	else {
		const user = await findUser({ id: data.user_id });
		return database(TABLE).insert(data).onConflict('url').ignore()
			.then(async (result) => {
				if (result.length === 0) {
					return 'You have already added this site.';
				} else {
					await AddTokenToDB(user.company ? user.company : '', user.email, data.url);
					return 'The site was successfully added.';
				}
			})
			.catch((error) => {
				return `insert failed: ${error.message}`;
			});
	}
}

export async function deleteSiteByURL(url: string, user_id: number): Promise<number> {
	await RemoveTokenFromDB(url);
	return database(TABLE).where({ 'user_id': user_id, 'url': url }).del()
}

/**
 * Safely deletes a site and all its related records to avoid foreign key constraint violations
 * This function deletes in the correct order: sites_permission -> sites_plans -> allowed_sites
 */
export async function deleteSiteWithRelatedRecords(url: string, user_id: number): Promise<number> {
	return database.transaction(async (trx) => {
		try {
			// First, find the site to get its ID
			const site = await trx(TABLE)
				.select(siteColumns)
				.where({ [siteColumns.url]: url, [siteColumns.user_id]: user_id })
				.first();

			if (!site) {
				throw new Error('Site not found');
			}

			const siteId = site.id;

			// Delete from sites_permission table first (if it references sites_plans)
			await trx(TABLES.sitePermissions)
				.where('sites_plan_id', 'IN', 
					trx(TABLES.sitesPlans)
						.select('id')
						.where({ 'allowed_site_id': siteId })
				)
				.del();

			// Delete from sites_plans table (references allowed_sites)
			await trx(TABLES.sitesPlans)
				.where({ 'allowed_site_id': siteId })
				.del();

			// Finally, delete from allowed_sites table
			const deletedCount = await trx(TABLE)
				.where({ 'user_id': user_id, 'url': url })
				.del();

			// Remove token from MongoDB
			// await RemoveTokenFromDB(url);

			return deletedCount;
		} catch (error) {
			console.error('Error in deleteSiteWithRelatedRecords:', error);
			throw error;
		}
	});
}

export async function updateAllowedSiteURL(site_id: number, url: string, user_id: number): Promise<number> {
	const urlExists = await database(TABLE)
        .select(siteColumns)
        .where({ 'allowed_sites.url': url })
        .andWhereNot({ 'allowed_sites.id': site_id })
        .first();

    if (urlExists) {
        throw new Error("The provided URL is already in use.");
    }
	
	const exisitingSite = await database(TABLE).select(siteColumns).where({ [siteColumns.id]: site_id }).first();
	//await UpdateWebsiteURL(exisitingSite.url, url)
	return database(TABLE).where({ 'allowed_sites.user_id': user_id, 'allowed_sites.id': site_id }).update({
		'url': url
	});
}
