interface PreprocessingConfig {
  enabled: boolean
  batchSize: number
  maxConcurrency: number
  confidenceThreshold: number
  templateDetectionThreshold: number
  criticalIssuesBypass: boolean
  fallbackOnError: boolean
  debugMode: boolean
  costOptimization: {
    maxTokensPerBatch: number
    skipLowConfidenceIssues: boolean
    cacheGptResults: boolean
  }
}

/**
 * Default preprocessing configuration
 */
const DEFAULT_CONFIG: PreprocessingConfig = {
  enabled: process.env.ENHANCED_PROCESSING_ENABLED === 'true',
  batchSize: parseInt(process.env.PREPROCESSING_BATCH_SIZE || '5'),
  maxConcurrency: parseInt(process.env.PREPROCESSING_MAX_CONCURRENCY || '10'),
  confidenceThreshold: parseInt(process.env.PREPROCESSING_CONFIDENCE_THRESHOLD || '20'),
  templateDetectionThreshold: parseInt(process.env.PREPROCESSING_TEMPLATE_THRESHOLD || '3'),
  criticalIssuesBypass: process.env.PREPROCESSING_CRITICAL_BYPASS !== 'false',
  fallbackOnError: process.env.PREPROCESSING_FALLBACK_ON_ERROR !== 'false',
  debugMode: process.env.PREPROCESSING_DEBUG_MODE === 'true',
  costOptimization: {
    maxTokensPerBatch: parseInt(process.env.PREPROCESSING_MAX_TOKENS_PER_BATCH || '2000'),
    skipLowConfidenceIssues: process.env.PREPROCESSING_SKIP_LOW_CONFIDENCE !== 'false',
    cacheGptResults: process.env.PREPROCESSING_CACHE_GPT_RESULTS === 'true',
  },
}

/**
 * Current configuration instance
 */
let currentConfig: PreprocessingConfig = { ...DEFAULT_CONFIG }

/**
 * Get current preprocessing configuration
 */
export function getPreprocessingConfig(): PreprocessingConfig {
  return { ...currentConfig }
}

/**
 * Update preprocessing configuration
 */
export function updatePreprocessingConfig(updates: Partial<PreprocessingConfig>): void {
  currentConfig = { ...currentConfig, ...updates }

  if (currentConfig.debugMode) {
    console.log('🔧 Preprocessing config updated:', updates)
  }
}

/**
 * Reset configuration to defaults
 */
export function resetPreprocessingConfig(): void {
  currentConfig = { ...DEFAULT_CONFIG }
  console.log('🔄 Preprocessing config reset to defaults')
}

/**
 * Environment-specific configurations
 */
export const ENVIRONMENT_CONFIGS = {
  development: {
    enabled: true,
    debugMode: false,
    maxConcurrency: 3,
    fallbackOnError: true,
  },

  local: {
    enabled: true,
    debugMode: false,
    maxConcurrency: 3,
    fallbackOnError: true,
  },

  staging: {
    enabled: true,
    debugMode: false,
    maxConcurrency: 8,
    fallbackOnError: true,
  },

  production: {
    enabled: true, // Enable enhanced processing in production
    debugMode: false,
    maxConcurrency: 15,
    fallbackOnError: true,
  },
}

/**
 * Apply environment-specific configuration
 */
export function applyEnvironmentConfig(environment: keyof typeof ENVIRONMENT_CONFIGS): void {
  const envConfig = ENVIRONMENT_CONFIGS[environment]
  if (envConfig) {
    updatePreprocessingConfig(envConfig)
    console.log(`🌍 Applied ${environment} preprocessing configuration`)
  }
}

/**
 * Feature flags for gradual rollout
 */
export const FEATURE_FLAGS = {
  // Core preprocessing features
  SMART_DEDUPLICATION: process.env.FF_SMART_DEDUPLICATION === 'true',
  CONFIDENCE_SCORING: process.env.FF_CONFIDENCE_SCORING === 'true',
  TEMPLATE_DETECTION: process.env.FF_TEMPLATE_DETECTION === 'true',
  BATCH_PROCESSING: process.env.FF_BATCH_PROCESSING === 'true',

  // Advanced features
  GPT_FUNCTION_CALLING: process.env.FF_GPT_FUNCTION_CALLING === 'true',
  ENHANCED_SCORING: process.env.FF_ENHANCED_SCORING === 'true',
  COST_OPTIMIZATION: process.env.FF_COST_OPTIMIZATION === 'true',

  // Experimental features
  RUNNER_AGREEMENT_SCORING: process.env.FF_RUNNER_AGREEMENT === 'true',
  DYNAMIC_BATCHING: process.env.FF_DYNAMIC_BATCHING === 'true',
  PREDICTIVE_FILTERING: process.env.FF_PREDICTIVE_FILTERING === 'true',
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[feature] && currentConfig.enabled
}

/**
 * Get processing statistics thresholds
 */
export function getProcessingThresholds() {
  return {
    confidence: {
      high: 80,
      medium: 50,
      low: currentConfig.confidenceThreshold,
    },
    template: {
      detectionThreshold: currentConfig.templateDetectionThreshold,
      maxRepresentatives: 2,
    },
    batch: {
      size: currentConfig.batchSize,
      maxConcurrency: currentConfig.maxConcurrency,
    },
  }
}

/**
 * Validate configuration
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (currentConfig.batchSize < 1 || currentConfig.batchSize > 10) {
    errors.push('Batch size must be between 1 and 10')
  }

  if (currentConfig.maxConcurrency < 1 || currentConfig.maxConcurrency > 20) {
    errors.push('Max concurrency must be between 1 and 20')
  }

  if (currentConfig.confidenceThreshold < 0 || currentConfig.confidenceThreshold > 100) {
    errors.push('Confidence threshold must be between 0 and 100')
  }

  if (currentConfig.templateDetectionThreshold < 2) {
    errors.push('Template detection threshold must be at least 2')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Initialize configuration based on environment
 */
export function initializePreprocessingConfig(): void {
  const environment = (process.env.NODE_ENV as keyof typeof ENVIRONMENT_CONFIGS) || 'development'

  // Apply environment-specific settings
  if (ENVIRONMENT_CONFIGS[environment]) {
    applyEnvironmentConfig(environment)
  }

  // Validate configuration
  const validation = validateConfig()
  if (!validation.valid) {
    console.warn('⚠️ Preprocessing configuration validation failed:', validation.errors)
    // Reset to defaults on validation failure
    resetPreprocessingConfig()
  }

  if (currentConfig.debugMode) {
    console.log('🚀 Preprocessing initialized with config:', currentConfig)
    console.log('🎛️ Feature flags:', FEATURE_FLAGS)
  }
}

// Initialize on module load
initializePreprocessingConfig()
