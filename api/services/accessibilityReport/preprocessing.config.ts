// Performance-focused preprocessing configuration
export const preprocessingConfig = {
  // Speed optimizations
  performance: {
    maxConcurrency: parseInt(process.env.PREPROCESSING_MAX_CONCURRENCY || '25'),
    batchSize: parseInt(process.env.PREPROCESSING_BATCH_SIZE || '15'),
    skipLowConfidenceThreshold: parseInt(process.env.SKIP_LOW_CONFIDENCE_THRESHOLD || '40'),
    maxLowConfidenceIssues: parseInt(process.env.MAX_LOW_CONFIDENCE_ISSUES || '20'),
    fastMode: process.env.PREPROCESSING_FAST_MODE === 'true',
    gptModel: process.env.PREPROCESSING_GPT_MODEL || 'meta-llama/llama-3.1-8b-instruct:free',
  },

  // Quality vs Speed tradeoffs
  qualityLevels: {
    fast: {
      confidenceThreshold: 50,
      maxBatchSize: 20,
      skipTemplateAnalysis: true,
      useFallbacks: true,
      maxRetries: 0,
    },
    balanced: {
      confidenceThreshold: 30,
      maxBatchSize: 15,
      skipTemplateAnalysis: false,
      useFallbacks: false,
      maxRetries: 1,
    },
    thorough: {
      confidenceThreshold: 20,
      maxBatchSize: 10,
      skipTemplateAnalysis: false,
      useFallbacks: false,
      maxRetries: 2,
    },
  },

  // Feature flags for speed
  features: {
    FF_SMART_DEDUPLICATION: process.env.FF_SMART_DEDUPLICATION !== 'false',
    FF_CONFIDENCE_SCORING: process.env.FF_CONFIDENCE_SCORING !== 'false',
    FF_TEMPLATE_ANALYSIS: process.env.FF_TEMPLATE_ANALYSIS !== 'false' && process.env.PREPROCESSING_FAST_MODE !== 'true',
    FF_BATCH_PROCESSING: process.env.FF_BATCH_PROCESSING !== 'false',
    FF_PARALLEL_PROCESSING: process.env.FF_PARALLEL_PROCESSING !== 'false',
    FF_SKIP_LOW_CONFIDENCE: process.env.FF_SKIP_LOW_CONFIDENCE === 'true',
  },

  // Debug and monitoring
  monitoring: {
    debugMode: process.env.PREPROCESSING_DEBUG_MODE === 'true',
    performanceLogging: process.env.PREPROCESSING_PERF_LOG === 'true',
  },
}

/**
 * Get performance-optimized config based on mode
 */
export function getPerformanceConfig(mode: 'fast' | 'balanced' | 'thorough' = 'balanced') {
  const baseConfig = preprocessingConfig.qualityLevels[mode]

  return {
    ...baseConfig,
    maxConcurrency: preprocessingConfig.performance.maxConcurrency,
    fastMode: mode === 'fast',
    features: preprocessingConfig.features,
  }
}

/**
 * Environment-specific optimizations
 */
export function getOptimizedConfig() {
  const nodeEnv = process.env.NODE_ENV

  if (nodeEnv === 'production') {
    return getPerformanceConfig('balanced')
  }
  if (nodeEnv === 'development') {
    return getPerformanceConfig('fast')
  }
  return getPerformanceConfig('thorough')
}
