import { combineResolvers } from 'graphql-resolvers'

import { getCacheStats, clearMemoryCache, resetCacheStats } from '../../services/cache/apiResponseCache.service'
import { isAuthenticated, allowedOrganization } from './authorization.resolver'

const resolvers = {
  Query: {
    /**
     * Get cache statistics (authenticated users only)
     */
    getCacheStatistics: combineResolvers(
      allowedOrganization,
      isAuthenticated,
      async () => {
        try {
          const stats = getCacheStats()
          return {
            success: true,
            stats,
          }
        } catch (error: any) {
          return {
            success: false,
            error: error.message,
            stats: null,
          }
        }
      }
    ),
  },

  Mutation: {
    /**
     * Clear memory cache (admin operation)
     */
    clearMemoryCache: combineResolvers(
      allowedOrganization,
      isAuthenticated,
      async () => {
        try {
          clearMemoryCache()
          return {
            success: true,
            message: 'Memory cache cleared successfully',
          }
        } catch (error: any) {
          return {
            success: false,
            message: error.message,
          }
        }
      }
    ),

    /**
     * Reset cache statistics
     */
    resetCacheStatistics: combineResolvers(
      allowedOrganization,
      isAuthenticated,
      async () => {
        try {
          resetCacheStats()
          return {
            success: true,
            message: 'Cache statistics reset successfully',
          }
        } catch (error: any) {
          return {
            success: false,
            message: error.message,
          }
        }
      }
    ),
  },
}

export default resolvers

