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

export async function insertSite(data: allowedSites): Promise<FindAllowedSitesProps | string> {
	const startTime = Date.now();
	
	return database.transaction(async (trx) => {
		try {
			const result = await trx(TABLE)
				.insert(data)
				.onConflict('url')
				.ignore();

			if (result.length === 0) {
				console.log(`insertSite (duplicate) took: ${Date.now() - startTime}ms`);
				return 'You have already added this site.';
			}

			const insertedSite = await trx(TABLE)
				.select(siteColumns)
				.where({ [siteColumns.url]: data.url })
				.first();

			if (!insertedSite) {
				throw new Error('Failed to retrieve inserted site');
			}

			setImmediate(async () => {
				try {
					const user = await findUser({ id: data.user_id });
					if (user) {
						await AddTokenToDB(user.company ? user.company : '', user.email, data.url);
					}
				} catch (error) {
					console.error('Background AddTokenToDB failed:', error);
				}
			});

			return insertedSite;

		} catch (error) {
			console.error('insertSite transaction error:', error);
			return `insert failed: ${error.message}`;
		}
	});
}

export async function deleteSiteByURL(url: string, user_id: number): Promise<number> {
	await RemoveTokenFromDB(url);
	return database(TABLE).where({ 'user_id': user_id, 'url': url }).del()
}

/**
 * Safely deletes a site and all its related records to avoid foreign key constraint violations
 * Uses a transaction to ensure atomicity - either all records are deleted or none are
 */
export async function deleteSiteWithRelatedRecords(url: string, user_id: number): Promise<number> {
	return database.transaction(async (trx) => {
		try {
			// Find the site within the transaction
			const site = await trx(TABLE)
				.select(siteColumns)
				.where({ [siteColumns.url]: url, [siteColumns.user_id]: user_id })
				.first();

			if (!site) {
				throw new Error(`Site not found: ${url} for user ${user_id}`);
			}

			const siteId = site.id;

			// Delete all related records within the same transaction
			await trx.raw('SET FOREIGN_KEY_CHECKS = 0');
			
			await Promise.all([
				trx('impressions').where('site_id', siteId).del()
					.then(count => console.log(`Deleted ${count} impressions`))
					.catch(err => console.log(`Impressions deletion skipped: ${err.message}`)),
				trx('problem_reports').where('site_id', siteId).del()
					.then(count => console.log(`Deleted ${count} problem_reports`))
					.catch(err => console.log(`Problem reports deletion skipped: ${err.message}`)),
				trx('unique_visitors').where('site_id', siteId).del()
					.then(count => console.log(`Deleted ${count} unique_visitors`))
					.catch(err => console.log(`Unique visitors deletion skipped: ${err.message}`)),
				trx('accessibility_reports').where('allowed_sites_id', siteId).del()
					.then(count => console.log(`Deleted ${count} accessibility_reports`))
					.catch(err => console.log(`Accessibility reports deletion skipped: ${err.message}`)),
				trx('accessibility_scans').where('site_id', siteId).del()
					.then(count => console.log(`Deleted ${count} accessibility_scans`))
					.catch(err => console.log(`Accessibility scans deletion skipped: ${err.message}`)),
				trx('widget_settings').where('allowed_site_id', siteId).del()
					.then(count => console.log(`Deleted ${count} widget_settings`))
					.catch(err => console.log(`Widget settings deletion skipped: ${err.message}`)),
				trx('sites_plans').where('allowed_site_id', siteId).del()
					.then(count => console.log(`Deleted ${count} sites_plans`))
					.catch(err => console.log(`Sites plans deletion skipped: ${err.message}`)),
				trx('site_permissions').where('allowed_site_id', siteId).del()
					.then(count => console.log(`Deleted ${count} site_permissions`))
					.catch(err => console.log(`Site permissions deletion skipped: ${err.message}`)),
			]);

			await trx.raw('SET FOREIGN_KEY_CHECKS = 1');

			// Delete the main site record within the same transaction
			const deletedCount = await trx(TABLE)
				.where({ 'user_id': user_id, 'url': url })
				.del();

			console.log(`Deleted site: ${url} (${deletedCount} records)`);
			return deletedCount;
			
		} catch (error) {
			console.error(`Error in deleteSiteWithRelatedRecords for ${url}:`, error);
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
