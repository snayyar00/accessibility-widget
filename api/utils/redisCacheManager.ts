import { createClient, RedisClientType } from 'redis'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

/**
 * Redis Cache Manager
 * Provides Redis-based caching with same interface as the old in-memory cache
 * 
 * Features:
 * - Redis persistent storage with TTL
 * - Automatic connection management
 * - Cache statistics and monitoring
 * - Compatible with existing cache interface
 */

export interface CacheOptions {
  /** Time-to-live for cache in milliseconds (default: 30 minutes) */
  ttl?: number
  /** Custom key prefix */
  keyPrefix?: string
  /** Whether to compress data before storing */
  compress?: boolean
}

export interface CacheEntry<T = any> {
  data: T
  timestamp: number
  expiresAt: number
  source: 'redis' | 'fresh'
  key: string
}

export interface CacheStats {
  redisHits: number
  misses: number
  totalRequests: number
  cacheSize: number
  lastCleanup: number
}

class RedisCacheManager {
  private redisClient: RedisClientType | null = null
  private stats: CacheStats
  private defaultOptions: Required<Omit<CacheOptions, 'compress'>> & { compress: boolean }
  private isConnected: boolean = false
  private connectionPromise: Promise<void> | null = null

  constructor() {
    this.stats = {
      redisHits: 0,
      misses: 0,
      totalRequests: 0,
      cacheSize: 0,
      lastCleanup: Date.now(),
    }

    this.defaultOptions = {
      ttl: 30 * 60 * 1000, // 30 minutes
      keyPrefix: 'cache',
      compress: false,
    }

    // Initialize Redis client
    this.initializeRedisClient()
  }

  private async initializeRedisClient(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise
    }

    this.connectionPromise = (async () => {
      const { REDIS_URL, REDIS_HOST, REDIS_PORT, REDIS_PASSWORD } = process.env

      try {
        // Support both REDIS_URL and individual host/port/password
        const redisUrl = REDIS_URL || `redis://${REDIS_HOST || 'localhost'}:${REDIS_PORT || 6379}`
        
        this.redisClient = createClient({
          url: redisUrl,
          password: REDIS_PASSWORD,
          socket: {
            reconnectStrategy: (retries) => {
              if (retries > 10) {
                console.error('❌ Redis: Max reconnection attempts reached')
                return new Error('Max reconnection attempts reached')
              }
              // Exponential backoff: 100ms, 200ms, 400ms, etc.
              return Math.min(retries * 100, 3000)
            },
          },
        })

        this.redisClient.on('error', (err) => {
          console.error('❌ Redis Client Error:', err)
          this.isConnected = false
        })

        this.redisClient.on('connect', () => {
          console.log('🔌 Redis: Connecting...')
        })

        this.redisClient.on('ready', () => {
          console.log('✅ Redis: Connected and ready')
          this.isConnected = true
        })

        this.redisClient.on('reconnecting', () => {
          console.log('🔄 Redis: Reconnecting...')
          this.isConnected = false
        })

        this.redisClient.on('end', () => {
          console.log('🔌 Redis: Connection closed')
          this.isConnected = false
        })

        await this.redisClient.connect()
        console.log('✅ RedisCacheManager: Redis storage initialized successfully')
      } catch (error) {
        console.error('❌ RedisCacheManager: Failed to initialize Redis client', error)
        this.redisClient = null
        this.isConnected = false
      }
    })()

    return this.connectionPromise
  }

  private async ensureConnection(): Promise<boolean> {
    if (this.isConnected && this.redisClient) {
      return true
    }

    try {
      await this.initializeRedisClient()
      return this.isConnected
    } catch (error) {
      console.error('❌ Redis connection check failed:', error)
      return false
    }
  }

  /**
   * Get data from cache
   */
  async get<T = any>(key: string, options?: Partial<CacheOptions>): Promise<CacheEntry<T> | null> {
    const opts = { ...this.defaultOptions, ...options }
    this.stats.totalRequests++

    if (!(await this.ensureConnection()) || !this.redisClient) {
      console.warn('⚠️ Redis not available, returning cache miss')
      this.stats.misses++
      return null
    }

    try {
      const redisKey = this.buildRedisKey(key, opts.keyPrefix)
      const cachedData = await this.redisClient.get(redisKey)

      if (cachedData) {
        const parsed = JSON.parse(cachedData)
        this.stats.redisHits++
        console.log(`🎯 Cache HIT (Redis): ${key}`)
        
        return {
          data: parsed.data,
          timestamp: parsed.timestamp,
          expiresAt: parsed.expiresAt,
          source: 'redis',
          key,
        }
      }
    } catch (error) {
      console.error(`❌ RedisCacheManager: Redis fetch failed for key ${key}`, error)
    }

    // Cache miss
    this.stats.misses++
    console.log(`❌ Cache MISS: ${key}`)
    return null
  }

  /**
   * Set data in cache
   */
  async set<T = any>(
    key: string,
    data: T,
    options?: Partial<CacheOptions>
  ): Promise<void> {
    const opts = { ...this.defaultOptions, ...options }

    if (!(await this.ensureConnection()) || !this.redisClient) {
      console.warn('⚠️ Redis not available, skipping cache set')
      return
    }

    try {
      const redisKey = this.buildRedisKey(key, opts.keyPrefix)
      const expiresAt = Date.now() + opts.ttl
      
      const cacheData = {
        data,
        timestamp: Date.now(),
        expiresAt,
        version: '1.0',
      }

      // Set with TTL in seconds
      const ttlSeconds = Math.floor(opts.ttl / 1000)
      await this.redisClient.set(redisKey, JSON.stringify(cacheData), {
        EX: ttlSeconds,
      })
      
      console.log(`💾 Cache SET (Redis): ${key} (TTL: ${ttlSeconds}s)`)
    } catch (error) {
      console.error(`❌ RedisCacheManager: Redis save failed for key ${key}`, error)
    }
  }

  /**
   * Delete data from cache
   */
  async delete(key: string, options?: Partial<CacheOptions>): Promise<void> {
    const opts = { ...this.defaultOptions, ...options }

    if (!(await this.ensureConnection()) || !this.redisClient) {
      console.warn('⚠️ Redis not available, skipping cache delete')
      return
    }

    try {
      const redisKey = this.buildRedisKey(key, opts.keyPrefix)
      await this.redisClient.del(redisKey)
      console.log(`🗑️ Cache DELETE (Redis): ${key}`)
    } catch (error) {
      console.error(`❌ RedisCacheManager: Redis delete failed for key ${key}`, error)
    }
  }

  /**
   * Clear all cache with a specific prefix
   */
  async clearByPrefix(prefix: string = 'cache'): Promise<void> {
    if (!(await this.ensureConnection()) || !this.redisClient) {
      console.warn('⚠️ Redis not available, skipping cache clear')
      return
    }

    try {
      const pattern = `${prefix}:*`
      const keys = await this.redisClient.keys(pattern)
      
      if (keys.length > 0) {
        await this.redisClient.del(keys)
        console.log(`🧹 Cleared ${keys.length} cache entries with prefix: ${prefix}`)
      }
    } catch (error) {
      console.error('❌ RedisCacheManager: Failed to clear cache', error)
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return {
      ...this.stats,
    }
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      redisHits: 0,
      misses: 0,
      totalRequests: 0,
      cacheSize: 0,
      lastCleanup: Date.now(),
    }
  }

  /**
   * Get cache hit rate
   */
  getHitRate(): number {
    if (this.stats.totalRequests === 0) return 0
    const hits = this.stats.redisHits
    return (hits / this.stats.totalRequests) * 100
  }

  /**
   * Get all keys matching a pattern
   */
  async getKeys(pattern: string = '*'): Promise<string[]> {
    if (!(await this.ensureConnection()) || !this.redisClient) {
      return []
    }

    try {
      return await this.redisClient.keys(pattern)
    } catch (error) {
      console.error('❌ Failed to get keys:', error)
      return []
    }
  }

  /**
   * Check if a key exists
   */
  async exists(key: string, options?: Partial<CacheOptions>): Promise<boolean> {
    const opts = { ...this.defaultOptions, ...options }

    if (!(await this.ensureConnection()) || !this.redisClient) {
      return false
    }

    try {
      const redisKey = this.buildRedisKey(key, opts.keyPrefix)
      const exists = await this.redisClient.exists(redisKey)
      return exists === 1
    } catch (error) {
      console.error('❌ Failed to check key existence:', error)
      return false
    }
  }

  // ========== Private Helper Methods ==========

  private buildRedisKey(key: string, prefix: string): string {
    // Sanitize key to be Redis-compatible
    const sanitizedKey = key.replace(/[^a-zA-Z0-9-_.:]/g, '_')
    return `${prefix}:${sanitizedKey}`
  }

  /**
   * Shutdown Redis connection
   */
  async destroy(): Promise<void> {
    if (this.redisClient) {
      try {
        await this.redisClient.quit()
        console.log('✅ Redis connection closed gracefully')
      } catch (error) {
        console.error('❌ Error closing Redis connection:', error)
      }
    }
  }

  /**
   * Get Redis client for advanced operations
   */
  getClient(): RedisClientType | null {
    return this.redisClient
  }

  /**
   * Check if Redis is connected
   */
  isReady(): boolean {
    return this.isConnected
  }
}

// Export singleton instance
export const redisCacheManager = new RedisCacheManager()

/**
 * Utility function for caching API responses with Redis
 */
export async function cacheApiResponse<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options?: Partial<CacheOptions>
): Promise<T> {
  // Try to get from cache
  const cached = await redisCacheManager.get<T>(key, options)
  
  if (cached) {
    return cached.data
  }

  // Fetch fresh data
  const freshData = await fetchFn()

  // Store in cache
  await redisCacheManager.set(key, freshData, options)

  return freshData
}

export default redisCacheManager

