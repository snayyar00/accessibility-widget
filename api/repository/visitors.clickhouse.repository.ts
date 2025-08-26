import clickhouseClient from '../config/clickhouse.config'
import database from '../config/database.config'
import { TABLES } from '../constants/database.constant'
import logger from '../utils/logger'

const TABLE = TABLES.visitors

export const visitorColumns = {
  id: 'id',
  site_id: 'site_id',
  ip_address: 'ip_address',
  city: 'city',
  country: 'country',
  zipcode: 'zipcode',
  continent: 'continent',
  first_visit: 'first_visit',
}

export type VisitorInfo = {
  id?: number
  site_id?: number
  ip_address?: string
  city?: string
  country?: string
  zipcode?: string
  continent?: string
  first_visit?: string
}

export type FindVisitorsBySiteId = {
  id: number
  siteId: number
  ipAddress: string
  city: string
  country: string
  zipcode: string
  continent: string
  firstVisit: string
}

export type FindVisitorsResponse = FindVisitorsBySiteId[] & {
  count: number
}

export async function insertVisitor(data: VisitorInfo): Promise<number[]> {
  try {
    // Check if visitor already exists
    const existingVisitorQuery = `
      SELECT id FROM unique_visitors 
      WHERE ip_address = {ip_address:String} AND site_id = {site_id:Int32}
      LIMIT 1
    `

    const existingResult = await clickhouseClient.query({
      query: existingVisitorQuery,
      query_params: {
        ip_address: data.ip_address!,
        site_id: data.site_id!,
      },
    })

    const existingData = (await existingResult.json()) as { data: Array<{ id: number }> }
    if (existingData.data && existingData.data.length > 0) {
      return [0] // Visitor already exists
    }

    // Generate a unique ID for the visitor (using timestamp in seconds + random for Int32)
    const now = Math.floor(Date.now() / 1000) // Unix timestamp in seconds
    const random = Math.floor(Math.random() * 1000) // Random 0-999
    const visitorId = parseInt(`${now.toString().slice(-6)}${random.toString().padStart(3, '0')}`) // Use last 6 digits of timestamp + 3 digit random

    // Use the insert method for ClickHouse INSERTs
    await clickhouseClient.insert({
      table: 'unique_visitors',
      values: [
        {
          id: visitorId,
          site_id: data.site_id!,
          ip_address: data.ip_address || '',
          city: data.city || '',
          country: data.country || '',
          zipcode: data.zipcode || '',
          continent: data.continent || '',
          first_visit: new Date(),
        },
      ],
      format: 'JSONEachRow',
    })

    console.log(`✅ ClickHouse SUCCESS: Inserted visitor with ID ${visitorId} for site_id ${data.site_id}, IP ${data.ip_address}`)

    return [visitorId]
  } catch (error) {
    logger.error('Error inserting visitor:', error)
    throw error
  }
}

export async function findVisitorBySiteId(id: number): Promise<FindVisitorsBySiteId[]> {
  const query = `
    SELECT 
      id,
      site_id,
      ip_address,
      city,
      country,
      zipcode,
      continent,
      first_visit
    FROM unique_visitors
    WHERE site_id = {site_id:Int32}
  `

  try {
    const result = await clickhouseClient.query({
      query,
      query_params: { site_id: id },
    })

    const data = (await result.json()) as { data: Array<{ id: number; site_id: number; ip_address: string; city: string; country: string; zipcode: string; continent: string; first_visit: string }> }
    return data.data.map((visitor) => ({
      id: visitor.id,
      siteId: visitor.site_id,
      ipAddress: visitor.ip_address,
      city: visitor.city,
      country: visitor.country,
      zipcode: visitor.zipcode,
      continent: visitor.continent,
      firstVisit: visitor.first_visit,
    }))
  } catch (error) {
    logger.error('Error finding visitors by site ID:', error)
    throw error
  }
}

export async function findVisitorByURL(url: string): Promise<FindVisitorsBySiteId[]> {
  try {
    // First, get the site_id from MySQL allowed_sites table
    const site = await database(TABLES.allowed_sites).select('id').where({ url }).first()

    if (!site) {
      return [] // No site found, return empty array
    }

    // Then query ClickHouse unique_visitors table
    const query = `
      SELECT 
        id,
        site_id,
        ip_address,
        city,
        country,
        zipcode,
        continent,
        first_visit
      FROM unique_visitors
      WHERE site_id = {site_id:Int32}
    `

    const result = await clickhouseClient.query({
      query,
      query_params: { site_id: site.id },
    })

    const data = (await result.json()) as { data: Array<{ id: number; site_id: number; ip_address: string; city: string; country: string; zipcode: string; continent: string; first_visit: string }> }

    console.log(`✅ ClickHouse SUCCESS: Retrieved ${data.data.length} visitors for site_id ${site.id} (${url})`)

    return data.data.map((visitor) => ({
      id: visitor.id,
      siteId: visitor.site_id,
      ipAddress: visitor.ip_address,
      city: visitor.city,
      country: visitor.country,
      zipcode: visitor.zipcode,
      continent: visitor.continent,
      firstVisit: visitor.first_visit,
    }))
  } catch (error) {
    logger.error('Error finding visitors by URL:', error)
    throw error
  }
}

export async function findVisitorByURLDate(url: string, startDate: Date, endDate: Date): Promise<FindVisitorsBySiteId[]> {
  try {
    // First, get the site_id from MySQL allowed_sites table
    const site = await database(TABLES.allowed_sites).select('id').where({ url }).first()

    if (!site) {
      return [] // No site found, return empty array
    }

    // Format dates for ClickHouse (YYYY-MM-DD HH:MM:SS)
    const formatDateForClickHouse = (date: Date) => {
      return date.toISOString().slice(0, 19).replace('T', ' ')
    }

    const formattedStartDate = formatDateForClickHouse(startDate)
    const formattedEndDate = formatDateForClickHouse(endDate)

    // Then query ClickHouse unique_visitors table
    const query = `
      SELECT 
        id,
        site_id,
        ip_address,
        city,
        country,
        zipcode,
        continent,
        first_visit
      FROM unique_visitors
      WHERE site_id = {site_id:Int32}
        AND first_visit >= '${formattedStartDate}'
        AND first_visit <= '${formattedEndDate}'
    `

    const result = await clickhouseClient.query({
      query,
      query_params: {
        site_id: site.id,
      },
    })

    const data = (await result.json()) as { data: Array<{ id: number; site_id: number; ip_address: string; city: string; country: string; zipcode: string; continent: string; first_visit: string }> }
    return data.data.map((visitor) => ({
      id: visitor.id,
      siteId: visitor.site_id,
      ipAddress: visitor.ip_address,
      city: visitor.city,
      country: visitor.country,
      zipcode: visitor.zipcode,
      continent: visitor.continent,
      firstVisit: visitor.first_visit,
    }))
  } catch (error) {
    logger.error('Error finding visitors by URL and date:', error)
    throw error
  }
}

export async function findVisitorByIp(ip_address: string) {
  const query = `
    SELECT 
      id,
      site_id,
      ip_address,
      city,
      country,
      zipcode,
      continent,
      first_visit
    FROM unique_visitors
    WHERE ip_address = {ip_address:String}
    LIMIT 1
  `

  try {
    const result = await clickhouseClient.query({
      query,
      query_params: { ip_address },
    })

    const data = (await result.json()) as { data: Array<{ id: number; site_id: number; ip_address: string; city: string; country: string; zipcode: string; continent: string; first_visit: string }> }
    if (data.data && data.data.length > 0) {
      const visitor = data.data[0]
      return {
        id: visitor.id,
        siteId: visitor.site_id,
        ipAddress: visitor.ip_address,
        city: visitor.city,
        country: visitor.country,
        zipcode: visitor.zipcode,
        continent: visitor.continent,
        firstVisit: visitor.first_visit,
      }
    }
    return undefined
  } catch (error) {
    logger.error('Error finding visitor by IP:', error)
    throw error
  }
}

export async function updateVisitorByIp(ip_address: string, data: VisitorInfo): Promise<number> {
  const updateFields = []

  if (data.city !== undefined) {
    updateFields.push(`city = '${data.city.replace(/'/g, "''")}'`)
  }
  if (data.country !== undefined) {
    updateFields.push(`country = '${data.country.replace(/'/g, "''")}'`)
  }
  if (data.zipcode !== undefined) {
    updateFields.push(`zipcode = '${data.zipcode.replace(/'/g, "''")}'`)
  }
  if (data.continent !== undefined) {
    updateFields.push(`continent = '${data.continent.replace(/'/g, "''")}'`)
  }

  if (updateFields.length === 0) {
    return 0 // No fields to update
  }

  const query = `
    ALTER TABLE unique_visitors 
    UPDATE ${updateFields.join(', ')}
    WHERE ip_address = '${ip_address.replace(/'/g, "''")}'
  `

  try {
    await clickhouseClient.query({
      query,
    })

    return 1 // Return 1 to indicate success
  } catch (error) {
    logger.error('Error updating visitor by IP:', error)
    throw error
  }
}

export async function deleteVisitorId(id: number): Promise<number> {
  const query = `
    ALTER TABLE unique_visitors 
    DELETE WHERE id = ${id}
  `

  try {
    await clickhouseClient.query({
      query,
    })

    return 1 // Return 1 to indicate success
  } catch (error) {
    logger.error('Error deleting visitor by ID:', error)
    throw error
  }
}

export async function deleteVisitorIp(ip_address: string): Promise<number> {
  const query = `
    ALTER TABLE unique_visitors 
    DELETE WHERE ip_address = '${ip_address.replace(/'/g, "''")}'
  `

  try {
    await clickhouseClient.query({
      query,
    })

    return 1 // Return 1 to indicate success
  } catch (error) {
    logger.error('Error deleting visitor by IP:', error)
    throw error
  }
}
