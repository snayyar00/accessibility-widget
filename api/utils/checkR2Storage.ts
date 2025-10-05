/**
 * Utility to check R2 storage contents
 * Use this to verify if your API responses are being cached in R2
 */

import { ListObjectsV2Command } from '@aws-sdk/client-s3'
import { getR2Client, isR2Available } from './r2Storage'

/**
 * List all objects in the R2 bucket
 */
export async function listR2Objects(prefix?: string, maxKeys: number = 100) {
  if (!isR2Available()) {
    console.error('❌ R2 is not available. Check your environment variables.')
    return []
  }

  try {
    const client = getR2Client()
    const command = new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET!,
      Prefix: prefix,
      MaxKeys: maxKeys,
    })

    const response = await client.send(command)
    const objects = response.Contents || []

    console.log(`\n📦 Found ${objects.length} objects in R2:`)
    console.log('─'.repeat(80))

    objects.forEach((obj, index) => {
      const sizeKB = ((obj.Size || 0) / 1024).toFixed(2)
      const lastModified = obj.LastModified?.toLocaleString() || 'Unknown'
      console.log(`${index + 1}. ${obj.Key}`)
      console.log(`   Size: ${sizeKB} KB | Last Modified: ${lastModified}`)
    })

    console.log('─'.repeat(80))
    console.log(`\nTotal: ${objects.length} objects`)
    console.log(`Bucket: ${process.env.R2_BUCKET}`)
    console.log(`Prefix: ${prefix || 'All objects'}\n`)

    return objects
  } catch (error) {
    console.error('❌ Error listing R2 objects:', error)
    return []
  }
}

/**
 * Check if R2 is properly configured and accessible
 */
export async function testR2Connection() {
  console.log('\n🔍 Testing R2 Connection...\n')

  if (!isR2Available()) {
    console.error('❌ R2 is NOT available')
    console.log('\nMissing environment variables. Make sure you have:')
    console.log('  - R2_ENDPOINT')
    console.log('  - R2_ACCESS_KEY_ID')
    console.log('  - R2_SECRET_ACCESS_KEY')
    console.log('  - R2_BUCKET\n')
    return false
  }

  console.log('✅ R2 client initialized')
  console.log('─'.repeat(80))
  console.log(`Endpoint: ${process.env.R2_ENDPOINT}`)
  console.log(`Bucket: ${process.env.R2_BUCKET}`)
  console.log('─'.repeat(80))

  try {
    // Try to list objects to verify connection
    const objects = await listR2Objects(undefined, 5)
    console.log(`\n✅ R2 connection successful!`)
    console.log(`Found ${objects.length} objects in bucket\n`)
    return true
  } catch (error) {
    console.error('❌ R2 connection failed:', error)
    return false
  }
}

/**
 * Check cache statistics by prefix
 */
export async function checkCacheStats(prefix?: string) {
  if (!isR2Available()) {
    console.error('❌ R2 is not available')
    return
  }

  try {
    const objects = await listR2Objects(prefix, 1000)

    const totalSize = objects.reduce((sum, obj) => sum + (obj.Size || 0), 0)
    const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2)

    const byPrefix: Record<string, number> = {}
    objects.forEach((obj) => {
      const key = obj.Key || ''
      const prefix = key.split('/')[0]
      byPrefix[prefix] = (byPrefix[prefix] || 0) + 1
    })

    console.log('\n📊 Cache Statistics:')
    console.log('─'.repeat(80))
    console.log(`Total Objects: ${objects.length}`)
    console.log(`Total Size: ${totalSizeMB} MB`)
    console.log('\nBy Category:')
    Object.entries(byPrefix).forEach(([prefix, count]) => {
      console.log(`  ${prefix}: ${count} objects`)
    })
    console.log('─'.repeat(80) + '\n')
  } catch (error) {
    console.error('❌ Error getting cache stats:', error)
  }
}

// Export for CLI usage
export default {
  listR2Objects,
  testR2Connection,
  checkCacheStats,
}

