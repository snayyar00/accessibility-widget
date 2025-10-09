import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { Readable } from 'stream'
import * as dotenv from 'dotenv'
import { redisCacheManager } from './redisCacheManager'

// Load environment variables
dotenv.config()

/**
 * Multi-layer Cache Manager
 * Provides Redis caching with R2 persistent storage fallback
 * 
 * Features:
 * - Fast Redis cache with TTL
 * - Persistent R2 storage
 * - Automatic cache warming from R2
 * - Cache statistics and monitoring
 * 
 * MIGRATED FROM: In-memory cache to Redis for better persistence and scalability
 */

export interface CacheOptions {
  /** Time-to-live for Redis cache in milliseconds (default: 30 minutes) */
  memoryTTL?: number
  /** Time-to-live for R2 cache in milliseconds (default: 7 days) */
  r2TTL?: number
  /** Enable R2 storage (default: true) */
  enableR2?: boolean
  /** Enable Redis cache (default: true) */
  enableMemory?: boolean
  /** Custom key prefix for storage */
  keyPrefix?: string
  /** Whether to compress data before storing */
  compress?: boolean
}

export interface CacheEntry<T = any> {
  data: T
  timestamp: number
  expiresAt: number
  source: 'memory' | 'r2' | 'fresh' | 'redis'
  key: string
}

export interface CacheStats {
  memoryHits: number
  r2Hits: number
  misses: number
  totalRequests: number
  memorySize: number
  lastCleanup: number
}

class CacheManager {
  private s3Client: S3Client | null = null
  private stats: CacheStats
  private defaultOptions: Required<CacheOptions>

  constructor() {
    this.stats = {
      memoryHits: 0, // Now tracks Redis hits for backward compatibility
      r2Hits: 0,
      misses: 0,
      totalRequests: 0,
      memorySize: 0,
      lastCleanup: Date.now(),
    }

    this.defaultOptions = {
      memoryTTL: 30 * 60 * 1000, // 30 minutes - now used for Redis TTL
      r2TTL: 7 * 24 * 60 * 60 * 1000, // 7 days
      enableR2: true,
      enableMemory: true, // Now controls Redis instead of in-memory
      keyPrefix: 'cache',
      compress: false,
    }

    // Initialize R2 client if credentials are available
    this.initializeR2Client()
  }

  private initializeR2Client(): void {
    const { R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env

    if (R2_ENDPOINT && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET) {
      try {
        this.s3Client = new S3Client({
          region: 'auto',
          endpoint: R2_ENDPOINT,
          credentials: {
            accessKeyId: R2_ACCESS_KEY_ID,
            secretAccessKey: R2_SECRET_ACCESS_KEY,
          },
        })
        console.log('✅ CacheManager: R2 storage initialized successfully')
      } catch (error) {
        console.error('❌ CacheManager: Failed to initialize R2 client', error)
        this.s3Client = null
      }
    } else {
      console.warn('⚠️ CacheManager: R2 credentials not found, R2 caching disabled')
    }
  }

  /**
   * Get data from cache with fallback to R2
   */
  async get<T = any>(key: string, options?: Partial<CacheOptions>): Promise<CacheEntry<T> | null> {
    const opts = { ...this.defaultOptions, ...options }
    this.stats.totalRequests++

    // 1. Try Redis cache first (replaces in-memory cache)
    if (opts.enableMemory) {
      const redisEntry = await redisCacheManager.get<T>(key, {
        ttl: opts.memoryTTL,
        keyPrefix: opts.keyPrefix,
      })
      
      if (redisEntry) {
        this.stats.memoryHits++
        console.log(`🎯 Cache HIT (Redis): ${key}`)
        return {
          ...redisEntry,
          source: 'memory', // Keep as 'memory' for backward compatibility
        } as CacheEntry<T>
      }
    }

    // 2. Try R2 storage
    if (opts.enableR2 && this.s3Client) {
      try {
        const r2Key = this.buildR2Key(key, opts.keyPrefix)
        const r2Data = await this.fetchFromR2<T>(r2Key)
        
        if (r2Data) {
          this.stats.r2Hits++
          console.log(`🎯 Cache HIT (R2): ${key}`)

          // Warm up Redis cache
          if (opts.enableMemory) {
            await redisCacheManager.set(key, r2Data, {
              ttl: opts.memoryTTL,
              keyPrefix: opts.keyPrefix,
            })
          }

          return {
            data: r2Data,
            timestamp: Date.now(),
            expiresAt: Date.now() + opts.r2TTL,
            source: 'r2',
            key,
          }
        }
      } catch (error) {
        console.error(`❌ CacheManager: R2 fetch failed for key ${key}`, error)
      }
    }

    // 3. Cache miss
    this.stats.misses++
    console.log(`❌ Cache MISS: ${key}`)
    return null
  }

  /**
   * Set data in cache (both Redis and R2)
   */
  async set<T = any>(
    key: string,
    data: T,
    options?: Partial<CacheOptions>
  ): Promise<void> {
    const opts = { ...this.defaultOptions, ...options }

    // 1. Store in Redis cache (replaces in-memory)
    if (opts.enableMemory) {
      await redisCacheManager.set(key, data, {
        ttl: opts.memoryTTL,
        keyPrefix: opts.keyPrefix,
      })
      console.log(`💾 Cache SET (Redis): ${key}`)
    }

    // 2. Store in R2
    if (opts.enableR2 && this.s3Client) {
      try {
        const r2Key = this.buildR2Key(key, opts.keyPrefix)
        await this.saveToR2(r2Key, data)
        console.log(`💾 Cache SET (R2): ${key}`)
      } catch (error) {
        console.error(`❌ CacheManager: R2 save failed for key ${key}`, error)
      }
    }
  }

  /**
   * Delete data from cache
   */
  async delete(key: string, options?: Partial<CacheOptions>): Promise<void> {
    const opts = { ...this.defaultOptions, ...options }

    // 1. Delete from Redis
    if (opts.enableMemory) {
      await redisCacheManager.delete(key, {
        keyPrefix: opts.keyPrefix,
      })
      console.log(`🗑️ Cache DELETE (Redis): ${key}`)
    }

    // 2. Delete from R2
    if (opts.enableR2 && this.s3Client) {
      try {
        const r2Key = this.buildR2Key(key, opts.keyPrefix)
        await this.deleteFromR2(r2Key)
        console.log(`🗑️ Cache DELETE (R2): ${key}`)
      } catch (error) {
        console.error(`❌ CacheManager: R2 delete failed for key ${key}`, error)
      }
    }
  }

  /**
   * Clear all cache (Redis only for safety)
   */
  async clearMemory(): Promise<void> {
    await redisCacheManager.clearByPrefix(this.defaultOptions.keyPrefix)
    this.stats.memorySize = 0
    console.log('🧹 Redis cache cleared')
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return {
      ...this.stats,
      memorySize: this.memoryCache.size,
    }
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      memoryHits: 0,
      r2Hits: 0,
      misses: 0,
      totalRequests: 0,
      memorySize: this.memoryCache.size,
      lastCleanup: Date.now(),
    }
  }

  /**
   * Get cache hit rate
   */
  getHitRate(): number {
    if (this.stats.totalRequests === 0) return 0
    const hits = this.stats.memoryHits + this.stats.r2Hits
    return (hits / this.stats.totalRequests) * 100
  }

  // ========== Private Helper Methods ==========

  private buildR2Key(key: string, prefix: string): string {
    // Sanitize key to be R2-compatible
    const sanitizedKey = key.replace(/[^a-zA-Z0-9-_./]/g, '_')
    return `${prefix}/${sanitizedKey}.json`
  }

  private async saveToR2(key: string, data: any): Promise<void> {
    if (!this.s3Client) {
      throw new Error('R2 client not initialized')
    }

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
      Body: JSON.stringify({
        data,
        timestamp: Date.now(),
        version: '1.0',
      }),
      ContentType: 'application/json',
      Metadata: {
        cached_at: new Date().toISOString(),
      },
    })

    await this.s3Client.send(command)
  }

  private async fetchFromR2<T>(key: string): Promise<T | null> {
    if (!this.s3Client) {
      return null
    }

    try {
      const command = new GetObjectCommand({
        Bucket: process.env.R2_BUCKET!,
        Key: key,
      })

      const response = await this.s3Client.send(command)
      const stream = response.Body as Readable
      const chunks: Buffer[] = []

      for await (const chunk of stream) {
        chunks.push(chunk as Buffer)
      }

      const jsonString = Buffer.concat(chunks).toString('utf-8')
      const parsed = JSON.parse(jsonString)
      
      return parsed.data || parsed // Support both wrapped and unwrapped data
    } catch (error: any) {
      if (error.name === 'NoSuchKey' || error.Code === 'NoSuchKey') {
        return null // Key doesn't exist
      }
      throw error
    }
  }

  private async deleteFromR2(key: string): Promise<void> {
    if (!this.s3Client) {
      return
    }

    const command = new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
    })

    await this.s3Client.send(command)
  }

  /**
   * Shutdown Redis connection
   */
  async destroy(): Promise<void> {
    await redisCacheManager.destroy()
  }
}

// Export singleton instance
export const cacheManager = new CacheManager()

/**
 * Utility function for caching API responses
 */
export async function cacheApiResponse<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options?: Partial<CacheOptions>
): Promise<T> {
  // Try to get from cache
  const cached = await cacheManager.get<T>(key, options)
  
  if (cached) {
    return cached.data
  }

  // Fetch fresh data
  const freshData = await fetchFn()

  // Store in cache
  await cacheManager.set(key, freshData, options)

  return freshData
}

export default cacheManager

