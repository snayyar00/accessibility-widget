/**
 * Cache System Usage Examples
 * 
 * This file demonstrates how to use the multi-layer caching system
 * in different scenarios throughout your application.
 */

import {
  cacheAccessibilityReport,
  cacheApiData,
  cacheDomainAnalysis,
  cacheTechStack,
  cacheTranslation,
  CACHE_CONFIGS,
  getCacheStats,
  invalidateAccessibilityReport,
} from '../services/cache/apiResponseCache.service'

// ============================================
// Example 1: Cache Accessibility Reports
// ============================================
async function exampleAccessibilityReport() {
  const url = 'https://example.com'

  // This will:
  // 1. Check memory cache first (30 min TTL)
  // 2. Check R2 storage if not in memory (7 days TTL)
  // 3. Fetch fresh data if not cached
  // 4. Save to both memory and R2
  const report = await cacheAccessibilityReport(url, async () => {
    // Your existing fetch logic
    return {
      url,
      score: 85,
      issues: [
        /* ... */
      ],
      timestamp: new Date().toISOString(),
    }
  })

  console.log('Accessibility Report:', report)
}

// ============================================
// Example 2: Cache Tech Stack Data
// ============================================
async function exampleTechStack() {
  const url = 'https://example.com'

  const techStack = await cacheTechStack(url, async () => {
    // Fetch from external API
    const response = await fetch(`https://api.example.com/techstack?url=${url}`)
    return await response.json()
  })

  console.log('Tech Stack:', techStack)
}

// ============================================
// Example 3: Custom Cache Configuration
// ============================================
async function exampleCustomCache() {
  const userId = 'user-123'
  const key = `user-profile-${userId}`

  // Use custom TTL and settings
  const profile = await cacheApiData(
    key,
    async () => {
      // Fetch user profile
      return {
        id: userId,
        name: 'John Doe',
        email: 'john@example.com',
      }
    },
    {
      memoryTTL: 5 * 60 * 1000, // 5 minutes in memory
      r2TTL: 60 * 60 * 1000, // 1 hour in R2
      keyPrefix: 'user-profiles',
      enableR2: true,
      enableMemory: true,
    }
  )

  console.log('User Profile:', profile)
}

// ============================================
// Example 4: Memory-Only Fast Cache
// ============================================
async function exampleFastCache() {
  const sessionId = 'session-xyz'

  // For temporary data that doesn't need persistence
  const sessionData = await cacheApiData(
    `session-${sessionId}`,
    async () => {
      return {
        sessionId,
        data: 'temporary session data',
      }
    },
    CACHE_CONFIGS.FAST_CACHE // Uses memory-only, no R2
  )

  console.log('Session Data:', sessionData)
}

// ============================================
// Example 5: Cache Translation Results
// ============================================
async function exampleTranslation() {
  const content = 'Hello, world!'
  const targetLang = 'es'

  const translation = await cacheTranslation(content, targetLang, async () => {
    // Call translation API
    return {
      original: content,
      translated: '¡Hola, mundo!',
      language: targetLang,
    }
  })

  console.log('Translation:', translation)
}

// ============================================
// Example 6: Domain Analysis
// ============================================
async function exampleDomainAnalysis() {
  const domain = 'example.com'

  const analysis = await cacheDomainAnalysis(domain, async () => {
    // Perform domain analysis
    return {
      domain,
      registrar: 'Example Registrar',
      createdDate: '2020-01-01',
      expiryDate: '2025-01-01',
    }
  })

  console.log('Domain Analysis:', analysis)
}

// ============================================
// Example 7: Invalidate Cache
// ============================================
async function exampleInvalidateCache() {
  const url = 'https://example.com'

  // Remove cached accessibility report when data is updated
  await invalidateAccessibilityReport(url)

  console.log('Cache invalidated for:', url)
}

// ============================================
// Example 8: Monitor Cache Performance
// ============================================
async function exampleCacheStats() {
  // Get current cache statistics
  const stats = getCacheStats()

  console.log('Cache Statistics:')
  console.log('- Total Requests:', stats.totalRequests)
  console.log('- Memory Hits:', stats.memoryHits)
  console.log('- R2 Hits:', stats.r2Hits)
  console.log('- Misses:', stats.misses)
  console.log('- Hit Rate:', stats.hitRate)
  console.log('- Effectiveness:', stats.effectiveness)
  console.log('- Memory Size:', stats.memorySize)

  // Alert if hit rate is low
  const hitRate = parseFloat(stats.hitRate)
  if (hitRate < 50) {
    console.warn('⚠️ Low cache hit rate! Consider adjusting TTL settings.')
  }
}

// ============================================
// Example 9: Batch Cache Operations
// ============================================
async function exampleBatchCache() {
  const urls = ['https://site1.com', 'https://site2.com', 'https://site3.com']

  // Cache multiple items in parallel
  const reports = await Promise.all(
    urls.map((url) =>
      cacheAccessibilityReport(url, async () => {
        // Fetch report for each URL
        return {
          url,
          score: Math.floor(Math.random() * 100),
          timestamp: new Date().toISOString(),
        }
      })
    )
  )

  console.log('Batch Reports:', reports)
}

// ============================================
// Example 10: Conditional Caching
// ============================================
async function exampleConditionalCache() {
  const url = 'https://example.com'
  const forceRefresh = false // Set to true to bypass cache

  if (forceRefresh) {
    // Bypass cache and fetch fresh data
    const freshData = await fetchFreshData(url)
    // Update cache with new data
    await cacheAccessibilityReport(url, async () => freshData)
  } else {
    // Use cached data
    const cachedData = await cacheAccessibilityReport(url, async () => {
      return await fetchFreshData(url)
    })
    console.log('Data:', cachedData)
  }
}

async function fetchFreshData(url: string) {
  // Your fetch logic here
  return { url, data: 'fresh data' }
}

// ============================================
// Example 11: R2-Only Storage (No Memory)
// ============================================
async function exampleR2OnlyCache() {
  const reportId = 'report-123'

  // For large reports that shouldn't consume memory
  const largeReport = await cacheApiData(
    reportId,
    async () => {
      // Generate large report
      return {
        id: reportId,
        data: new Array(10000).fill('large data'),
      }
    },
    {
      memoryTTL: 0,
      r2TTL: 30 * 24 * 60 * 60 * 1000, // 30 days
      keyPrefix: 'large-reports',
      enableR2: true,
      enableMemory: false, // Skip memory cache for large data
    }
  )

  console.log('Large Report ID:', largeReport.id)
}

// ============================================
// Run Examples
// ============================================
export async function runExamples() {
  console.log('=== Cache System Examples ===\n')

  try {
    await exampleAccessibilityReport()
    await exampleTechStack()
    await exampleCustomCache()
    await exampleFastCache()
    await exampleTranslation()
    await exampleDomainAnalysis()
    await exampleInvalidateCache()
    await exampleCacheStats()
    await exampleBatchCache()
    await exampleConditionalCache()
    await exampleR2OnlyCache()

    console.log('\n✅ All examples completed successfully!')
  } catch (error) {
    console.error('❌ Error running examples:', error)
  }
}

// Uncomment to run examples
// runExamples();

