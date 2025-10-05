export const cacheSchema = `
  type CacheStats {
    memoryHits: Int!
    r2Hits: Int!
    misses: Int!
    totalRequests: Int!
    memorySize: Int!
    lastCleanup: Float!
    hitRate: String!
    effectiveness: String!
  }

  type CacheStatisticsResponse {
    success: Boolean!
    stats: CacheStats
    error: String
  }

  type CacheOperationResponse {
    success: Boolean!
    message: String!
  }

  extend type Query {
    """
    Get current cache statistics including hit rates and memory usage
    """
    getCacheStatistics: CacheStatisticsResponse! @rateLimit(limit: 20, duration: 60, message: "Too many cache statistics requests. Please try again later.")
  }

  extend type Mutation {
    """
    Clear the in-memory cache (does not affect R2 storage)
    """
    clearMemoryCache: CacheOperationResponse! @rateLimit(limit: 5, duration: 60, message: "Too many clear cache requests. Please try again later.")

    """
    Reset cache statistics counters
    """
    resetCacheStatistics: CacheOperationResponse! @rateLimit(limit: 5, duration: 60, message: "Too many reset statistics requests. Please try again later.")
  }
`

