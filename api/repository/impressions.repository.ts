import database from '~/config/database.config';
import { TABLES } from '~/constants/database.constant';
import { siteColumns } from './sites_allowed.repository';

const TABLE = TABLES.impressions;

export const impressionsColumns = {
	id: 'impressions.id',
	site_id: 'impressions.site_id',
	visitor_id: 'impressions.visitor_id',
	widget_opened: 'impressions.widget_opened',
	widget_closed: 'impressions.widget_closed',
	createdAt: 'impressions.created_at',
	profileCounts: 'impressions.profileCounts',
};

type impressionsProps = {
	id?: number,
	site_id?: number,
	visitor_id?: number,
	widget_opened?: boolean,
	widget_closed?: boolean,
	createdAt?: string,
	profileCounts?: any
};


export async function findImpressionsURL(user_id: number, site_url: string): Promise<impressionsProps[]> {
	return database(TABLE)
		.join(TABLES.allowed_sites, impressionsColumns.site_id, siteColumns.id)
		.select(impressionsColumns, `${siteColumns.url} as url`)
		.where({ [siteColumns.url]: site_url, [siteColumns.user_id]: user_id });
}

export async function findImpressionsURLDate(user_id: number, site_url: string, startDate: Date, endDate: Date): Promise<impressionsProps[]> {
    return database(TABLE)
        .join(TABLES.allowed_sites, impressionsColumns.site_id, siteColumns.id)
        .select(impressionsColumns, `${siteColumns.url} as url`)
        .where({ [siteColumns.url]: site_url })
        .andWhere(impressionsColumns.createdAt, '>=', startDate)
        .andWhere(impressionsColumns.createdAt, '<=', endDate);
}

export async function findEngagementURLDate(
	user_id: number,
	site_url: string,
	startDate: string,
	endDate: string
) {
	
	const results = await database('impressions')
		.join('allowed_sites', 'impressions.site_id', 'allowed_sites.id')
		.select([
			database.raw('DATE(impressions.created_at) as date'),
			database.raw('COUNT(*) as totalImpressions'),
			database.raw(`
		COUNT(CASE WHEN impressions.widget_opened = true OR impressions.widget_closed = true THEN 1 ELSE NULL END) as engagedImpressions
	  `)
		])
		.whereBetween('impressions.created_at', [startDate, endDate])
		.andWhere({ 'allowed_sites.url': site_url, 'allowed_sites.user_id': user_id })
		.groupByRaw('DATE(impressions.created_at)')
		.orderBy('date', 'asc');

		const engagementRates = results.map((result: any) => {
			// Convert the UTC date to the desired time zone
			const localDate = new Date(result.date + 'Z'); // Assuming result.date is in 'YYYY-MM-DD' format
	
			const engagementRate = (Number(result.engagedImpressions) / Number(result.totalImpressions)) * 100;
	
			return {
				date: localDate.toISOString().split('T')[0],
				engagementRate: engagementRate,
				totalEngagements: result.engagedImpressions,
				totalImpressions: result.totalImpressions
			};
		});
	
		return engagementRates;
}


export async function findImpressionsSiteId(site_id: number): Promise<impressionsProps[]> {

	return database(TABLE)
		.select(impressionsColumns)
		.where('site_id', site_id);
}

export async function updateImpressions(id: number, interaction: string): Promise<number> {
	let field;
	if (interaction === 'widgetClosed') {
		field = 'widget_closed';
	}
	else if (interaction === 'widgetOpened') {
		field = 'widget_opened';
	}
	return database(TABLE)
		.where('id', id)
		.update({
			[field]: true
		});
}

export async function insertImpressions(data: impressionsProps) {
	return database(TABLE).insert(data);
}

export async function insertImpressionURL(data: any, url: string) {
	const site = await database(TABLES.allowed_sites)
		.select('id')
		.where({ url: url })
		.first();

	// Now, insert the impression data with the found site_id
	const dataToInsert = {
		...data,
		site_id: site.id, // Using the site_id from the found site
	};

	return database(TABLE).insert(dataToInsert);
}

export async function updateImpressionsWithProfileCounts(impressionId: number, profileCounts: JSON) {
	return database(TABLE)
			.where({ id: impressionId })
			.update({ profileCounts: JSON.stringify(profileCounts) });
}