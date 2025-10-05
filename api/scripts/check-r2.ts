#!/usr/bin/env tsx
/**
 * R2 Storage Check Script
 * 
 * Usage:
 *   npm run check-r2          # Test connection and list all objects
 *   npm run check-r2 cache    # List objects with 'cache' prefix
 *   npm run check-r2 reports  # List objects with 'reports' prefix
 */

import * as dotenv from 'dotenv'
import { testR2Connection, listR2Objects, checkCacheStats } from '../utils/checkR2Storage'

// Load environment variables
dotenv.config()

async function main() {
  const args = process.argv.slice(2)
  const prefix = args[0]

  console.log('\n🚀 R2 Storage Checker\n')

  // Test connection first
  const isConnected = await testR2Connection()

  if (!isConnected) {
    process.exit(1)
  }

  // List objects with optional prefix
  if (prefix) {
    console.log(`\n📂 Listing objects with prefix: "${prefix}"\n`)
    await listR2Objects(prefix)
  } else {
    console.log('\n📂 Listing all objects:\n')
    await listR2Objects(undefined, 20)
  }

  // Show stats
  console.log('\n📊 Getting cache statistics...\n')
  await checkCacheStats(prefix)

  console.log('✅ Done!\n')
}

main().catch((error) => {
  console.error('❌ Error:', error)
  process.exit(1)
})

