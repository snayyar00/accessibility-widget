import { createClient } from '@clickhouse/client'

// ClickHouse connection configuration
const getClickHouseConfig = () => {
  if (process.env.CLICKHOUSE_URL) {
    console.log('🔗 Using ClickHouse connection string from CLICKHOUSE_URL')
    return { url: process.env.CLICKHOUSE_URL }
  }
}

// Create ClickHouse client
const clickhouseClient = createClient(getClickHouseConfig())
export default clickhouseClient
