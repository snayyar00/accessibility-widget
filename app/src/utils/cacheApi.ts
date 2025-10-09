/**
 * Cache API Client
 * Replaces localStorage with Redis-backed API calls
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001'

export interface CacheEntry<T = any> {
  data: T
  metadata?: {
    timestamp: number
    expiresAt: number
    source: string
  }
}

export interface CacheOptions {
  /** Time-to-live in milliseconds (default: 30 minutes) */
  ttl?: number
  /** Cache key prefix (default: 'cache') */
  prefix?: string
}

/**
 * Get data from Redis cache
 */
export async function getCacheData<T = any>(
  key: string,
  options?: CacheOptions
): Promise<T | null> {
  try {
    const prefix = options?.prefix || 'cache'
    const response = await fetch(`${API_BASE_URL}/cache/${encodeURIComponent(key)}?prefix=${prefix}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (response.status === 404) {
      // Cache miss
      return null
    }

    if (!response.ok) {
      console.error('Failed to get cache data:', await response.text())
      return null
    }

    const result = await response.json()
    
    if (result.success && result.data !== undefined) {
      console.log(`✅ Cache HIT (Redis): ${key}`)
      return result.data as T
    }

    return null
  } catch (error) {
    console.error('Error getting cache data:', error)
    return null
  }
}

/**
 * Set data in Redis cache
 */
export async function setCacheData<T = any>(
  key: string,
  data: T,
  options?: CacheOptions
): Promise<boolean> {
  try {
    const ttl = options?.ttl || 30 * 60 * 1000 // Default: 30 minutes
    const prefix = options?.prefix || 'cache'

    const response = await fetch(`${API_BASE_URL}/cache`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key,
        data,
        ttl,
        prefix,
      }),
    })

    if (!response.ok) {
      console.error('Failed to set cache data:', await response.text())
      return false
    }

    const result = await response.json()
    
    if (result.success) {
      console.log(`💾 Cache SET (Redis): ${key}`)
      return true
    }

    return false
  } catch (error) {
    console.error('Error setting cache data:', error)
    return false
  }
}

/**
 * Delete data from Redis cache
 */
export async function deleteCacheData(
  key: string,
  options?: CacheOptions
): Promise<boolean> {
  try {
    const prefix = options?.prefix || 'cache'
    const response = await fetch(`${API_BASE_URL}/cache/${encodeURIComponent(key)}?prefix=${prefix}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      console.error('Failed to delete cache data:', await response.text())
      return false
    }

    const result = await response.json()
    
    if (result.success) {
      console.log(`🗑️ Cache DELETE (Redis): ${key}`)
      return true
    }

    return false
  } catch (error) {
    console.error('Error deleting cache data:', error)
    return false
  }
}

/**
 * Clear all cache entries with a specific prefix
 */
export async function clearCacheByPrefix(prefix: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/cache/prefix/${prefix}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      console.error('Failed to clear cache by prefix:', await response.text())
      return false
    }

    const result = await response.json()
    return result.success
  } catch (error) {
    console.error('Error clearing cache by prefix:', error)
    return false
  }
}

/**
 * Check if a cache key exists
 */
export async function cacheExists(
  key: string,
  options?: CacheOptions
): Promise<boolean> {
  try {
    const prefix = options?.prefix || 'cache'
    const response = await fetch(`${API_BASE_URL}/cache/exists/${encodeURIComponent(key)}?prefix=${prefix}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      return false
    }

    const result = await response.json()
    return result.exists || false
  } catch (error) {
    console.error('Error checking cache existence:', error)
    return false
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats() {
  try {
    const response = await fetch(`${API_BASE_URL}/cache/stats`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      return null
    }

    const result = await response.json()
    return result.stats || null
  } catch (error) {
    console.error('Error getting cache stats:', error)
    return null
  }
}

/**
 * Check Redis health
 */
export async function checkCacheHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/cache/health`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      return false
    }

    const result = await response.json()
    return result.success || false
  } catch (error) {
    console.error('Error checking cache health:', error)
    return false
  }
}

/**
 * Wrapper function similar to localStorage API
 */
export const cacheStorage = {
  /**
   * Get item from cache (async)
   */
  async getItem<T = any>(key: string): Promise<T | null> {
    return getCacheData<T>(key, { prefix: 'app' })
  },

  /**
   * Set item in cache (async)
   */
  async setItem<T = any>(key: string, value: T, ttl?: number): Promise<void> {
    await setCacheData(key, value, { prefix: 'app', ttl })
  },

  /**
   * Remove item from cache (async)
   */
  async removeItem(key: string): Promise<void> {
    await deleteCacheData(key, { prefix: 'app' })
  },

  /**
   * Clear all app cache
   */
  async clear(): Promise<void> {
    await clearCacheByPrefix('app')
  },
}

export default cacheStorage

