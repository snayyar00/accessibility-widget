import clickhouseClient from '../config/clickhouse.config'
import database from '../config/database.config'
import { TABLES } from '../constants/database.constant'
import logger from '../utils/logger'
import { findImpressionsURLDate as findMySQLImpressions, findEngagementURLDate as findMySQLEngagement } from './impressions.repository'

const TABLE = TABLES.impressions

export const impressionsColumns = {
  id: 'id',
  site_id: 'site_id',
  visitor_id: 'visitor_id',
  widget_opened: 'widget_opened',
  widget_closed: 'widget_closed',
  created_at: 'created_at',
  profileCounts: 'profileCounts',
}

type impressionsProps = {
  id?: number
  site_id?: number
  visitor_id?: number
  widget_opened?: boolean
  widget_closed?: boolean
  createdAt?: string
  profileCounts?: any
}

// Helper function to avoid double database lookup
async function findMySQLImpressionsWithSiteId(site_id: number, startDate: Date, endDate: Date): Promise<impressionsProps[]> {
  const result = await database(TABLE).select(impressionsColumns).where({ site_id }).andWhere(impressionsColumns.created_at, '>=', startDate).andWhere(impressionsColumns.created_at, '<=', endDate).orderBy(impressionsColumns.created_at, 'desc')

  return result
}

// Helper function for engagement data to avoid double database lookup
async function findMySQLEngagementWithSiteId(site_id: number, startDate: string, endDate: string) {
  const results = await database('impressions')
    .select([
      database.raw('DATE(impressions.created_at) as date'),
      database.raw('COUNT(*) as totalImpressions'),
      database.raw(`
        COUNT(CASE WHEN impressions.widget_opened = true OR impressions.widget_closed = true THEN 1 ELSE NULL END) as engagedImpressions
      `),
    ])
    .whereBetween('impressions.created_at', [startDate, endDate])
    .andWhere({ 'impressions.site_id': site_id })
    .groupByRaw('DATE(impressions.created_at)')
    .orderBy('date', 'asc')

  const engagementRates = results.map((result: any) => {
    // Convert the UTC date to the desired time zone
    const localDate = new Date(`${result.date}Z`) // Assuming result.date is in 'YYYY-MM-DD' format

    const engagementRate = (Number(result.engagedImpressions) / Number(result.totalImpressions)) * 100

    return {
      date: localDate.toISOString().split('T')[0],
      engagementRate,
      totalEngagements: result.engagedImpressions,
      totalImpressions: result.totalImpressions,
    }
  })

  return engagementRates
}

export async function findImpressionsURLDate(user_id: number, site_url: string, startDate: Date, endDate: Date): Promise<impressionsProps[]> {
  try {
    // First, get the site_id from MySQL allowed_sites table (single lookup)
    const site = await database(TABLES.allowed_sites).select('id').where({ url: site_url, user_id }).first()

    if (!site) {
      return [] // No site found, return empty array
    }

    // Format dates for ClickHouse (YYYY-MM-DD HH:MM:SS)
    const formatDateForClickHouse = (date: Date) => {
      return date.toISOString().slice(0, 19).replace('T', ' ')
    }

    const formattedStartDate = formatDateForClickHouse(startDate)
    const formattedEndDate = formatDateForClickHouse(endDate)

    // If CLICKHOUSE_FLAG is true, fetch from both ClickHouse and MySQL in parallel
    if (process.env.CLICKHOUSE_FLAG === 'true') {
      try {
        // Prepare ClickHouse query
        const clickhouseQuery = `
          SELECT 
            id,
            site_id,
            visitor_id,
            widget_opened,
            widget_closed,
            created_at as createdAt,
            profileCounts
          FROM impressions
          WHERE site_id = {site_id:Int32}
            AND created_at >= '${formattedStartDate}'
            AND created_at <= '${formattedEndDate}'
          ORDER BY created_at DESC
        `

        // Start both queries in parallel with static imports
        const [clickhouseResult, mysqlImpressions] = await Promise.all([
          clickhouseClient.query({
            query: clickhouseQuery,
            query_params: {
              site_id: site.id,
            },
          }),
          // Use static import - pass site.id to avoid double lookup
          findMySQLImpressionsWithSiteId(site.id, startDate, endDate),
        ])

        const clickhouseData = (await clickhouseResult.json()) as { data: impressionsProps[] }
        const clickhouseImpressions = clickhouseData.data || []

        console.log(`✅ ClickHouse SUCCESS: Retrieved ${clickhouseImpressions.length} impressions for site_id ${site.id} (${site_url})`)
        console.log(`✅ MySQL SUCCESS: Retrieved ${mysqlImpressions.length} impressions for comparison`)

        // Return both datasets with source identification
        return [...clickhouseImpressions.map((imp: impressionsProps) => ({ ...imp, source: 'clickhouse' })), ...mysqlImpressions.map((imp: impressionsProps) => ({ ...imp, source: 'mysql' }))]
      } catch (mysqlError) {
        console.log(`⚠️ MySQL parallel fetch failed, falling back to ClickHouse only: ${mysqlError.message}`)

        // Fallback to ClickHouse only if parallel fetch fails
        const clickhouseQuery = `
          SELECT 
            id,
            site_id,
            visitor_id,
            widget_opened,
            widget_closed,
            created_at as createdAt,
            profileCounts
          FROM impressions
          WHERE site_id = {site_id:Int32}
            AND created_at >= '${formattedStartDate}'
            AND created_at <= '${formattedEndDate}'
          ORDER BY created_at DESC
        `

        const clickhouseResult = await clickhouseClient.query({
          query: clickhouseQuery,
          query_params: {
            site_id: site.id,
          },
        })

        const clickhouseData = (await clickhouseResult.json()) as { data: impressionsProps[] }
        const clickhouseImpressions = clickhouseData.data || []

        return clickhouseImpressions.map((imp: impressionsProps) => ({ ...imp, source: 'clickhouse' }))
      }
    }

    // Return ClickHouse data only when CLICKHOUSE_FLAG is not true
    const clickhouseQuery = `
      SELECT 
        id,
        site_id,
        visitor_id,
        widget_opened,
        widget_closed,
        created_at as createdAt,
        profileCounts
      FROM impressions
      WHERE site_id = {site_id:Int32}
        AND created_at >= '${formattedStartDate}'
        AND created_at <= '${formattedEndDate}'
      ORDER BY created_at DESC
    `

    const clickhouseResult = await clickhouseClient.query({
      query: clickhouseQuery,
      query_params: {
        site_id: site.id,
      },
    })

    const clickhouseData = (await clickhouseResult.json()) as { data: impressionsProps[] }
    const clickhouseImpressions = clickhouseData.data || []

    return clickhouseImpressions.map((imp) => ({ ...imp, source: 'clickhouse' }))
  } catch (error) {
    logger.error('Error finding impressions by URL and date:', error)
    throw error
  }
}

export async function findEngagementURLDate(user_id: number, site_url: string, startDate: string, endDate: string) {
  try {
    // First, get the site_id from MySQL allowed_sites table (single lookup)
    const site = await database(TABLES.allowed_sites).select('id').where({ url: site_url, user_id }).first()

    if (!site) {
      return [] // No site found, return empty array
    }

    // Format dates for ClickHouse (YYYY-MM-DD format for date strings)
    const formatDateForClickHouse = (dateStr: string) => {
      return new Date(dateStr).toISOString().slice(0, 10) // YYYY-MM-DD
    }

    const formattedStartDate = formatDateForClickHouse(startDate)
    const formattedEndDate = formatDateForClickHouse(endDate)

    // If CLICKHOUSE_FLAG is true, fetch from both ClickHouse and MySQL in parallel
    if (process.env.CLICKHOUSE_FLAG === 'true') {
      try {
        // Prepare ClickHouse query
        const clickhouseQuery = `
          SELECT 
            toDate(created_at) as date,
            COUNT(*) as totalImpressions,
            countIf(widget_opened = 1 OR widget_closed = 1) as engagedImpressions
          FROM impressions
          WHERE created_at >= '${formattedStartDate}'
            AND created_at <= '${formattedEndDate}'
            AND site_id = {site_id:Int32}
          GROUP BY toDate(created_at)
          ORDER BY date ASC
        `

        // Start both queries in parallel with static imports
        const [clickhouseResult, mysqlEngagement] = await Promise.all([
          clickhouseClient.query({
            query: clickhouseQuery,
            query_params: {
              site_id: site.id,
            },
          }),
          // Use static import - pass site.id to avoid double lookup
          findMySQLEngagementWithSiteId(site.id, startDate, endDate),
        ])

        const clickhouseData = (await clickhouseResult.json()) as { data: Array<{ date: string; totalImpressions: number; engagedImpressions: number }> }
        const clickhouseEngagement = clickhouseData.data || []

        console.log(`✅ ClickHouse SUCCESS: Retrieved engagement data for site_id ${site.id} (${site_url}) - ${clickhouseEngagement.length} days`)
        console.log(`✅ MySQL SUCCESS: Retrieved engagement data for comparison - ${mysqlEngagement.length} days`)

        const clickhouseEngagementRates = clickhouseEngagement.map((result) => {
          const engagementRate = (Number(result.engagedImpressions) / Number(result.totalImpressions)) * 100

          return {
            date: result.date,
            engagementRate,
            totalEngagements: result.engagedImpressions,
            totalImpressions: result.totalImpressions,
            source: 'clickhouse',
          }
        })

        // Add source identification to MySQL data
        const mysqlEngagementWithSource = mysqlEngagement.map((item) => ({
          ...item,
          source: 'mysql',
        }))

        // Return both datasets
        return [...clickhouseEngagementRates, ...mysqlEngagementWithSource]
      } catch (mysqlError) {
        console.log(`⚠️ MySQL parallel fetch failed, falling back to ClickHouse only: ${mysqlError.message}`)

        // Fallback to ClickHouse only if parallel fetch fails
        const clickhouseQuery = `
          SELECT 
            toDate(created_at) as date,
            COUNT(*) as totalImpressions,
            countIf(widget_opened = 1 OR widget_closed = 1) as engagedImpressions
          FROM impressions
          WHERE created_at >= '${formattedStartDate}'
            AND created_at <= '${formattedEndDate}'
            AND site_id = {site_id:Int32}
          GROUP BY toDate(created_at)
          ORDER BY date ASC
        `

        const clickhouseResult = await clickhouseClient.query({
          query: clickhouseQuery,
          query_params: {
            site_id: site.id,
          },
        })

        const clickhouseData = (await clickhouseResult.json()) as { data: Array<{ date: string; totalImpressions: number; engagedImpressions: number }> }
        const clickhouseEngagement = clickhouseData.data || []

        const clickhouseEngagementRates = clickhouseEngagement.map((result) => {
          const engagementRate = (Number(result.engagedImpressions) / Number(result.totalImpressions)) * 100

          return {
            date: result.date,
            engagementRate,
            totalEngagements: result.engagedImpressions,
            totalImpressions: result.totalImpressions,
            source: 'clickhouse',
          }
        })

        return clickhouseEngagementRates
      }
    }

    // Return ClickHouse data only when CLICKHOUSE_FLAG is not true
    const clickhouseQuery = `
      SELECT 
        toDate(created_at) as date,
        COUNT(*) as totalImpressions,
        countIf(widget_opened = 1 OR widget_closed = 1) as engagedImpressions
      FROM impressions
      WHERE created_at >= '${formattedStartDate}'
        AND created_at <= '${formattedEndDate}'
        AND site_id = {site_id:Int32}
      GROUP BY toDate(created_at)
      ORDER BY date ASC
    `

    const clickhouseResult = await clickhouseClient.query({
      query: clickhouseQuery,
      query_params: {
        site_id: site.id,
      },
    })

    const clickhouseData = (await clickhouseResult.json()) as { data: Array<{ date: string; totalImpressions: number; engagedImpressions: number }> }
    const clickhouseEngagement = clickhouseData.data || []

    const clickhouseEngagementRates = clickhouseEngagement.map((result) => {
      const engagementRate = (Number(result.engagedImpressions) / Number(result.totalImpressions)) * 100

      return {
        date: result.date,
        engagementRate,
        totalEngagements: result.engagedImpressions,
        totalImpressions: result.totalImpressions,
        source: 'clickhouse',
      }
    })

    return clickhouseEngagementRates
  } catch (error) {
    logger.error('Error finding engagement data:', error)
    throw error
  }
}

export async function updateImpressionProfileCount(id: number, profileCounts: any): Promise<number> {
  const query = `
    ALTER TABLE impressions 
    UPDATE profileCounts = '${JSON.stringify(profileCounts).replace(/'/g, "''")}'
    WHERE id = ${id}
  `

  try {
    await clickhouseClient.query({
      query,
    })

    console.log(`✅ ClickHouse SUCCESS: Updated profile counts for impression ID ${id}`)

    return 1 // Return 1 to indicate success (similar to SQL affected rows)
  } catch (error) {
    logger.error('Error updating impression profile count:', error)
    throw error
  }
}

export async function updateImpressions(id: number, interaction: string): Promise<number> {
  let field
  if (interaction === 'widgetClosed') {
    field = 'widget_closed'
  } else if (interaction === 'widgetOpened') {
    field = 'widget_opened'
  } else {
    throw new Error('Invalid interaction type')
  }

  const query = `
    ALTER TABLE impressions 
    UPDATE ${field} = 1
    WHERE id = ${id}
  `

  try {
    await clickhouseClient.query({
      query,
    })

    console.log(`✅ ClickHouse SUCCESS: Updated ${interaction} for impression ID ${id}`)

    return 1 // Return 1 to indicate success
  } catch (error) {
    logger.error('Error updating impression interaction:', error)
    throw error
  }
}

export async function insertImpressionURL(data: any, url: string): Promise<number[]> {
  try {
    // First, get the site_id from MySQL allowed_sites table
    const site = await database(TABLES.allowed_sites).select('id').where({ url }).first()

    if (!site) {
      throw new Error(`Site not found for URL: ${url}`)
    }

    // Generate a unique ID for the impression (using timestamp in seconds + random for Int32)
    const now = Math.floor(Date.now() / 1000) // Unix timestamp in seconds
    const random = Math.floor(Math.random() * 1000) // Random 0-999
    const impressionId = parseInt(`${now.toString().slice(-6)}${random.toString().padStart(3, '0')}`) // Use last 6 digits of timestamp + 3 digit random

    // Use the insert method for ClickHouse INSERTs
    await clickhouseClient.insert({
      table: 'impressions',
      values: [
        {
          id: impressionId,
          site_id: site.id,
          visitor_id: data.visitor_id,
          created_at: new Date(),
          widget_opened: 0,
          widget_closed: 0,
          profileCounts: null,
        },
      ],
      format: 'JSONEachRow',
    })

    console.log(`✅ ClickHouse SUCCESS: Inserted impression with ID ${impressionId} for site_id ${site.id}, visitor_id ${data.visitor_id}`)

    return [impressionId]
  } catch (error) {
    logger.error('Error inserting impression:', error)
    throw error
  }
}
