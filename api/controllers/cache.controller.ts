import { Request, Response } from 'express'
import { redisCacheManager } from '../utils/redisCacheManager'

/**
 * Cache Controller
 * Provides REST API endpoints for frontend to interact with Redis cache
 * Replaces localStorage functionality with server-side Redis storage
 */

/**
 * Get cache data by key
 * GET /api/cache/:key
 */
export const getCacheData = async (req: Request, res: Response) => {
  try {
    const { key } = req.params
    const { prefix } = req.query

    if (!key) {
      return res.status(400).json({
        success: false,
        error: 'Cache key is required',
      })
    }

    const cacheEntry = await redisCacheManager.get(key, {
      keyPrefix: (prefix as string) || 'cache',
    })

    if (cacheEntry) {
      return res.status(200).json({
        success: true,
        data: cacheEntry.data,
        metadata: {
          timestamp: cacheEntry.timestamp,
          expiresAt: cacheEntry.expiresAt,
          source: cacheEntry.source,
        },
      })
    }

    return res.status(404).json({
      success: false,
      error: 'Cache entry not found',
    })
  } catch (error: any) {
    console.error('Error getting cache data:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve cache data',
      message: error.message,
    })
  }
}

/**
 * Set cache data
 * POST /api/cache
 * Body: { key: string, data: any, ttl?: number, prefix?: string }
 */
export const setCacheData = async (req: Request, res: Response) => {
  try {
    const { key, data, ttl, prefix } = req.body

    if (!key) {
      return res.status(400).json({
        success: false,
        error: 'Cache key is required',
      })
    }

    if (data === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Data is required',
      })
    }

    await redisCacheManager.set(key, data, {
      ttl: ttl || 30 * 60 * 1000, // Default: 30 minutes
      keyPrefix: prefix || 'cache',
    })

    return res.status(200).json({
      success: true,
      message: 'Cache data saved successfully',
      key,
    })
  } catch (error: any) {
    console.error('Error setting cache data:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to save cache data',
      message: error.message,
    })
  }
}

/**
 * Delete cache data by key
 * DELETE /api/cache/:key
 */
export const deleteCacheData = async (req: Request, res: Response) => {
  try {
    const { key } = req.params
    const { prefix } = req.query

    if (!key) {
      return res.status(400).json({
        success: false,
        error: 'Cache key is required',
      })
    }

    await redisCacheManager.delete(key, {
      keyPrefix: (prefix as string) || 'cache',
    })

    return res.status(200).json({
      success: true,
      message: 'Cache data deleted successfully',
      key,
    })
  } catch (error: any) {
    console.error('Error deleting cache data:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to delete cache data',
      message: error.message,
    })
  }
}

/**
 * Clear all cache entries with a specific prefix
 * DELETE /api/cache/prefix/:prefix
 */
export const clearCacheByPrefix = async (req: Request, res: Response) => {
  try {
    const { prefix } = req.params

    if (!prefix) {
      return res.status(400).json({
        success: false,
        error: 'Cache prefix is required',
      })
    }

    await redisCacheManager.clearByPrefix(prefix)

    return res.status(200).json({
      success: true,
      message: `Cache entries with prefix '${prefix}' cleared successfully`,
    })
  } catch (error: any) {
    console.error('Error clearing cache by prefix:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      message: error.message,
    })
  }
}

/**
 * Get cache statistics
 * GET /api/cache/stats
 */
export const getCacheStats = async (req: Request, res: Response) => {
  try {
    const stats = redisCacheManager.getStats()
    const hitRate = redisCacheManager.getHitRate()

    return res.status(200).json({
      success: true,
      stats: {
        ...stats,
        hitRate: hitRate.toFixed(2) + '%',
        effectiveness: hitRate > 50 ? 'Good' : hitRate > 30 ? 'Fair' : 'Poor',
      },
    })
  } catch (error: any) {
    console.error('Error getting cache stats:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve cache statistics',
      message: error.message,
    })
  }
}

/**
 * Check if a cache key exists
 * GET /api/cache/exists/:key
 */
export const checkCacheExists = async (req: Request, res: Response) => {
  try {
    const { key } = req.params
    const { prefix } = req.query

    if (!key) {
      return res.status(400).json({
        success: false,
        error: 'Cache key is required',
      })
    }

    const exists = await redisCacheManager.exists(key, {
      keyPrefix: (prefix as string) || 'cache',
    })

    return res.status(200).json({
      success: true,
      exists,
      key,
    })
  } catch (error: any) {
    console.error('Error checking cache existence:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to check cache existence',
      message: error.message,
    })
  }
}

/**
 * Health check for Redis connection
 * GET /api/cache/health
 */
export const getCacheHealth = async (req: Request, res: Response) => {
  try {
    const isReady = redisCacheManager.isReady()

    return res.status(isReady ? 200 : 503).json({
      success: isReady,
      status: isReady ? 'healthy' : 'unavailable',
      message: isReady ? 'Redis cache is operational' : 'Redis cache is not available',
    })
  } catch (error: any) {
    console.error('Error checking cache health:', error)
    return res.status(503).json({
      success: false,
      status: 'error',
      message: error.message,
    })
  }
}

