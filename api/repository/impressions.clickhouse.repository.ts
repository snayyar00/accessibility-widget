import clickhouseClient from '../config/clickhouse.config'
import database from '../config/database.config'
import { TABLES } from '../constants/database.constant'
import logger from '../utils/logger'

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

export async function findImpressionsURLDate(user_id: number, site_url: string, startDate: Date, endDate: Date): Promise<impressionsProps[]> {
  try {
    // First, get the site_id from MySQL allowed_sites table
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

    // Then query ClickHouse impressions table
    const query = `
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

    const result = await clickhouseClient.query({
      query,
      query_params: {
        site_id: site.id,
      },
    })

    const data = (await result.json()) as { data: impressionsProps[] }

    console.log(`✅ ClickHouse SUCCESS: Retrieved ${data.data.length} impressions for site_id ${site.id} (${site_url})`)

    return data.data
  } catch (error) {
    logger.error('Error finding impressions by URL and date:', error)
    throw error
  }
}

export async function findEngagementURLDate(user_id: number, site_url: string, startDate: string, endDate: string) {
  try {
    // First, get the site_id from MySQL allowed_sites table
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

    // Then query ClickHouse impressions table
    const query = `
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

    const result = await clickhouseClient.query({
      query,
      query_params: {
        site_id: site.id,
      },
    })

    const data = (await result.json()) as { data: Array<{ date: string; totalImpressions: number; engagedImpressions: number }> }

    console.log(`✅ ClickHouse SUCCESS: Retrieved engagement data for site_id ${site.id} (${site_url}) - ${data.data.length} days`)

    const engagementRates = data.data.map((result) => {
      const engagementRate = (Number(result.engagedImpressions) / Number(result.totalImpressions)) * 100

      return {
        date: result.date,
        engagementRate,
        totalEngagements: result.engagedImpressions,
        totalImpressions: result.totalImpressions,
      }
    })

    return engagementRates
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
