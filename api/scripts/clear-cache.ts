#!/usr/bin/env tsx
/**
 * Clear all cache - useful for debugging
 */

import * as dotenv from 'dotenv'
import { cacheManager } from '../utils/cacheManager'

dotenv.config()

async function main() {
  console.log('\n🧹 Clearing all cache...\n')
  
  // Clear memory cache
  cacheManager.clearMemory()
  console.log('✅ Memory cache cleared')
  
  // Reset stats
  cacheManager.resetStats()
  console.log('✅ Statistics reset')
  
  console.log('\n✅ All cache cleared!\n')
  console.log('Note: R2 storage is NOT cleared. To clear R2, delete files manually from your R2 bucket.\n')
}

main().catch((error) => {
  console.error('❌ Error:', error)
  process.exit(1)
})

