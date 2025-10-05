import { cacheManager, CacheOptions } from '../../utils/cacheManager'
import { generateReportKey } from '../../utils/r2Storage'

/**
 * API Response Cache Service
 * Simplified interface for caching API responses
 * 
 * Usage Examples:
 * 
 * 1. Cache an accessibility report:
 *    const report = await cacheAccessibilityReport(url, async () => {
 *      return await fetchAccessibilityReport(url)
 *    })
 * 
 * 2. Cache tech stack data:
 *    const techStack = await cacheTechStack(url, async () => {
 *      return await fetchTechStackFromAPI(url)
 *    })
 * 
 * 3. Cache with custom options:
 *    const data = await cacheApiData('custom-key', fetchFunction, {
 *      memoryTTL: 10 * 60 * 1000, // 10 minutes
 *      r2TTL: 24 * 60 * 60 * 1000, // 24 hours
 *    })
 */

/**
 * Default cache configurations for different data types
 */
export const CACHE_CONFIGS = {
  // Accessibility reports - Long-lived, large data
  ACCESSIBILITY_REPORT: {
    memoryTTL: 30 * 60 * 1000, // 30 minutes in memory
    r2TTL: 7 * 24 * 60 * 60 * 1000, // 7 days in R2
    keyPrefix: 'accessibility-reports',
    enableR2: true,
    enableMemory: true,
  } as CacheOptions,

  // Tech stack - Medium-lived
  TECH_STACK: {
    memoryTTL: 30 * 60 * 1000, // 30 minutes
    r2TTL: 3 * 24 * 60 * 60 * 1000, // 3 days
    keyPrefix: 'tech-stack',
    enableR2: true,
    enableMemory: true,
  } as CacheOptions,

  // Translation - Long-lived
  TRANSLATION: {
    memoryTTL: 60 * 60 * 1000, // 1 hour
    r2TTL: 30 * 24 * 60 * 60 * 1000, // 30 days
    keyPrefix: 'translations',
    enableR2: true,
    enableMemory: true,
  } as CacheOptions,

  // Domain analysis - Medium-lived
  DOMAIN_ANALYSIS: {
    memoryTTL: 20 * 60 * 1000, // 20 minutes
    r2TTL: 24 * 60 * 60 * 1000, // 1 day
    keyPrefix: 'domain-analysis',
    enableR2: true,
    enableMemory: true,
  } as CacheOptions,

  // API responses (generic) - Short-lived
  API_RESPONSE: {
    memoryTTL: 15 * 60 * 1000, // 15 minutes
    r2TTL: 24 * 60 * 60 * 1000, // 1 day
    keyPrefix: 'api-responses',
    enableR2: true,
    enableMemory: true,
  } as CacheOptions,

  // Fast cache (memory only) - Very short-lived
  FAST_CACHE: {
    memoryTTL: 5 * 60 * 1000, // 5 minutes
    r2TTL: 0,
    keyPrefix: 'fast-cache',
    enableR2: false,
    enableMemory: true,
  } as CacheOptions,
}

/**
 * Generate a cache key from URL or identifier
 */
function generateCacheKey(identifier: string, prefix?: string): string {
  // Normalize URL/identifier
  const normalized = identifier.toLowerCase().trim()
  
  // Create a simple hash for the key
  const hash = Buffer.from(normalized).toString('base64url').slice(0, 32)
  
  return prefix ? `${prefix}:${hash}` : hash
}

/**
 * Generic cache wrapper for any API response
 */
export async function cacheApiData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options?: Partial<CacheOptions>
): Promise<T> {
  // Try to get from cache
  const cached = await cacheManager.get<T>(key, options)
  
  if (cached) {
    console.log(`📦 Using cached data for: ${key} (source: ${cached.source})`)
    return cached.data
  }

  // Fetch fresh data
  console.log(`🔄 Fetching fresh data for: ${key}`)
  const freshData = await fetchFn()

  // Store in cache
  await cacheManager.set(key, freshData, options)

  return freshData
}

/**
 * Cache accessibility report
 */
export async function cacheAccessibilityReport<T>(
  url: string,
  fetchFn: () => Promise<T>,
  customOptions?: Partial<CacheOptions>
): Promise<T> {
  const key = generateCacheKey(url, 'accessibility-report')
  const options = { ...CACHE_CONFIGS.ACCESSIBILITY_REPORT, ...customOptions }
  
  return cacheApiData(key, fetchFn, options)
}

/**
 * Cache tech stack data
 */
export async function cacheTechStack<T>(
  url: string,
  fetchFn: () => Promise<T>,
  customOptions?: Partial<CacheOptions>
): Promise<T> {
  const key = generateCacheKey(url, 'tech-stack')
  const options = { ...CACHE_CONFIGS.TECH_STACK, ...customOptions }
  
  return cacheApiData(key, fetchFn, options)
}

/**
 * Cache translation
 */
export async function cacheTranslation<T>(
  content: string,
  targetLang: string,
  fetchFn: () => Promise<T>,
  customOptions?: Partial<CacheOptions>
): Promise<T> {
  const key = generateCacheKey(`${content}-${targetLang}`, 'translation')
  const options = { ...CACHE_CONFIGS.TRANSLATION, ...customOptions }
  
  return cacheApiData(key, fetchFn, options)
}

/**
 * Cache domain analysis
 */
export async function cacheDomainAnalysis<T>(
  domain: string,
  fetchFn: () => Promise<T>,
  customOptions?: Partial<CacheOptions>
): Promise<T> {
  const key = generateCacheKey(domain, 'domain-analysis')
  const options = { ...CACHE_CONFIGS.DOMAIN_ANALYSIS, ...customOptions }
  
  return cacheApiData(key, fetchFn, options)
}

/**
 * Invalidate cache for a specific key
 */
export async function invalidateCache(
  key: string,
  options?: Partial<CacheOptions>
): Promise<void> {
  await cacheManager.delete(key, options)
  console.log(`🗑️ Invalidated cache for: ${key}`)
}

/**
 * Invalidate accessibility report cache
 */
export async function invalidateAccessibilityReport(url: string): Promise<void> {
  const key = generateCacheKey(url, 'accessibility-report')
  await invalidateCache(key, CACHE_CONFIGS.ACCESSIBILITY_REPORT)
}

/**
 * Invalidate tech stack cache
 */
export async function invalidateTechStack(url: string): Promise<void> {
  const key = generateCacheKey(url, 'tech-stack')
  await invalidateCache(key, CACHE_CONFIGS.TECH_STACK)
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  const stats = cacheManager.getStats()
  const hitRate = cacheManager.getHitRate()
  
  return {
    ...stats,
    hitRate: hitRate.toFixed(2) + '%',
    effectiveness: hitRate > 50 ? 'Good' : hitRate > 30 ? 'Fair' : 'Poor',
  }
}

/**
 * Clear memory cache (useful for testing or memory management)
 */
export function clearMemoryCache(): void {
  cacheManager.clearMemory()
  console.log('🧹 Memory cache cleared')
}

/**
 * Reset cache statistics
 */
export function resetCacheStats(): void {
  cacheManager.resetStats()
  console.log('📊 Cache statistics reset')
}

export default {
  cacheApiData,
  cacheAccessibilityReport,
  cacheTechStack,
  cacheTranslation,
  cacheDomainAnalysis,
  invalidateCache,
  invalidateAccessibilityReport,
  invalidateTechStack,
  getCacheStats,
  clearMemoryCache,
  resetCacheStats,
}

