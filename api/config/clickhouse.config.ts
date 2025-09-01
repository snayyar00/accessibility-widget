import { createClient } from '@clickhouse/client'
import { isClickHouseDisabled } from '../utils/database.utils'

// ClickHouse connection configuration
const getClickHouseConfig = () => {
  if (process.env.CLICKHOUSE_URL) {
    console.log('🔗 Using ClickHouse connection string from CLICKHOUSE_URL')
    return { url: process.env.CLICKHOUSE_URL }
  }
}

// Create ClickHouse client
const clickhouseClient = createClient(getClickHouseConfig())

// Startup function to check and create tables if they don't exist
const initializeClickHouseTables = async () => {
  if (isClickHouseDisabled()) {
    console.log('🚫 ClickHouse is disabled via CLICKHOUSE_DISABLE_FLAG environment variable')
    return
  }

  try {
    console.log('🔍 Checking ClickHouse tables...')

    // Check if impressions table exists
    const impressionsExists = await clickhouseClient.query({
      query: "SELECT count() as count FROM system.tables WHERE database = 'default' AND name = 'impressions'",
    })

    const impressionsData = (await impressionsExists.json()) as { data: Array<{ count: string }> }
    const impressionsTableExists = parseInt(impressionsData.data[0]?.count || '0') > 0

    if (!impressionsTableExists) {
      console.log('📊 Creating impressions table...')
      await clickhouseClient.query({
        query: `
          CREATE TABLE impressions
          (
              created_at     DateTime DEFAULT now(),           
              id             Int32,                            
              profileCounts  Nullable(JSON),                   
              site_id        Int32,
              visitor_id     Int32,
              widget_closed  Nullable(UInt8),
              widget_opened  Nullable(UInt8)
          )
          ENGINE = MergeTree()
          PARTITION BY toYYYYMM(created_at)                    
          ORDER BY (site_id, created_at, visitor_id, id)      
          SETTINGS index_granularity = 8192
        `,
      })
      console.log('✅ impressions table created successfully!')
    } else {
      console.log('✅ impressions table already exists')
    }

    // Check if unique_visitors table exists
    const visitorsExists = await clickhouseClient.query({
      query: "SELECT count() as count FROM system.tables WHERE database = 'default' AND name = 'unique_visitors'",
    })

    const visitorsData = (await visitorsExists.json()) as { data: Array<{ count: string }> }
    const visitorsTableExists = parseInt(visitorsData.data[0]?.count || '0') > 0

    if (!visitorsTableExists) {
      console.log('👥 Creating unique_visitors table...')
      await clickhouseClient.query({
        query: `
          CREATE TABLE unique_visitors
          (
              city         Nullable(String),
              continent    Nullable(String),
              country      Nullable(String),
              first_visit  DateTime DEFAULT now(),
              id           Int32,               
              ip_address   Nullable(String),
              site_id      Int32,
              zipcode      Nullable(String)
          )
          ENGINE = MergeTree()
          PARTITION BY toYYYYMM(first_visit)                   
          ORDER BY (site_id, id, first_visit)                  
          SETTINGS index_granularity = 8192
        `,
      })
      console.log('✅ unique_visitors table created successfully!')
    } else {
      console.log('✅ unique_visitors table already exists')
    }

    console.log('🎉 ClickHouse tables initialization completed!')
  } catch (error) {
    console.error('❌ Error initializing ClickHouse tables:', error)
    console.log('💡 Please check your ClickHouse connection and permissions')
  }
}

// Initialize tables when module loads
initializeClickHouseTables()

export default clickhouseClient
