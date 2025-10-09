import { Router } from 'express'
import {
  getCacheData,
  setCacheData,
  deleteCacheData,
  clearCacheByPrefix,
  getCacheStats,
  checkCacheExists,
  getCacheHealth,
} from '../controllers/cache.controller'

const router = Router()

/**
 * Cache API Routes
 * Provides REST endpoints for Redis cache management
 */

// Health check
router.get('/health', getCacheHealth)

// Statistics
router.get('/stats', getCacheStats)

// Check if key exists
router.get('/exists/:key', checkCacheExists)

// Get cache data by key
router.get('/:key', getCacheData)

// Set cache data
router.post('/', setCacheData)

// Delete cache data by key
router.delete('/:key', deleteCacheData)

// Clear cache by prefix
router.delete('/prefix/:prefix', clearCacheByPrefix)

export default router

