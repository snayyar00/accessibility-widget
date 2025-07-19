// Production-ready translation configuration
export const TRANSLATION_CONFIG = {
  // AI Model Configuration - Optimized for speed and unlimited generation
  model: {
    name: 'google/gemini-flash-1.5', // Fastest model with excellent quality
    fallback: 'google/gemini-pro-1.5', // High-quality fallback
    temperature: 0.1, // Slight randomness for natural translations
    maxTokens: 8192, // Increased for comprehensive statements with no limits
    timeout: 45000, // 45 second timeout for larger responses and complex languages
  },

  // Caching Configuration
  cache: {
    duration: 24 * 60 * 60, // 24 hours in seconds
    keyPrefix: 'translation_v2_',
  },

  // Rate Limiting
  rateLimit: {
    maxRequestsPerMinute: 60, // Higher limit for fast model
    cooldownPeriod: 1000, // 1 second between duplicate requests (faster)
  },

  // Performance Monitoring
  monitoring: {
    logSuccessfulTranslations: process.env.NODE_ENV === 'production',
    logErrors: true,
    trackMetrics: process.env.NODE_ENV === 'production',
    trackSpeed: true, // Track response times for speed optimization
  },

  // Error Handling
  errorHandling: {
    maxRetries: 1, // Limited retries for speed
    fallbackToEnglish: true,
    userFriendlyErrors: true,
  },

  // Production Optimizations
  optimizations: {
    compressPrompts: false, // Use full prompts for quality with fast model
    batchRequests: true, // Enable batching for speed
    batchSize: 3, // Split content into chunks of 3 fields each
    maxParallelBatches: 2, // Process 2 batches in parallel
    preWarmCache: process.env.NODE_ENV === 'production',
    useStreamingIfAvailable: true, // Enable streaming for faster perceived response
  },

  // Batching Configuration
  batching: {
    enabled: false, // Disable batching for more reliable translations
    maxBatchSize: 5, // Larger batch size when enabled
    parallelBatches: 1, // Process sequentially for better reliability
    batchTimeout: 30000, // 30 seconds per batch
    retryFailedBatches: true,
  },
}

// Environment-specific overrides
if (process.env.NODE_ENV === 'development') {
  TRANSLATION_CONFIG.model.timeout = 60000 // Extra long timeout in dev for debugging
  TRANSLATION_CONFIG.monitoring.logSuccessfulTranslations = true
}

// Speed-optimized model alternatives (ordered by speed)
export const MODEL_TIERS = {
  ultraFast: 'google/gemini-flash-1.5', // Fastest model, ~0.5-2s response
  fast: 'openai/gpt-3.5-turbo', // ~$0.002/1k tokens, 2-4s response
  balanced: 'google/gemini-pro-1.5', // High quality, 3-6s response
  premium: 'openai/gpt-4o', // Highest quality, 5-10s response
  anthropic: 'anthropic/claude-3-haiku', // Fast anthropic option
} as const

export const SUPPORTED_LANGUAGES = [
  'en',
  'ar',
  'bg',
  'bn',
  'cs',
  'de',
  'el',
  'es',
  'fi',
  'fr',
  'he',
  'hi',
  'hr',
  'hu',
  'id',
  'it',
  'ja',
  'ko',
  'lt',
  'lv',
  'ms',
  'nl',
  'no',
  'pl',
  'pt',
  'pt-br',
  'ro',
  'ru',
  'sk',
  'sl',
  'sr',
  'sv',
  'th',
  'tr',
  'uk',
  'ur',
  'vi',
  'zh',
  'zh-tw',
  'da',
  'et',
  'ca',
] as const
