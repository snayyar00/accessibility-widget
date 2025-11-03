export const IS_LOCAL = process.env.NODE_ENV === 'local'
export const IS_DEV = process.env.NODE_ENV === 'development'
export const IS_PROD = process.env.NODE_ENV === 'production'

// Scanner polling configuration
export const SCANNER_MAX_POLLING_ATTEMPTS_SINGLE = parseInt(process.env.SCANNER_MAX_POLLING_ATTEMPTS_SINGLE || '60')
export const SCANNER_MAX_POLLING_ATTEMPTS_FULL = parseInt(process.env.SCANNER_MAX_POLLING_ATTEMPTS_FULL || '120')

// Job expiry configuration
// Default: 1 hour (3600000 milliseconds)
export const JOB_EXPIRY_MS = parseInt(process.env.JOB_EXPIRY_MS || '3600000')

// For Images
export const IMGPROXY_URL = process.env.IMGPROXY_URL || ''
export const IMGPROXY_KEY = process.env.IMGPROXY_KEY || ''
export const IMGPROXY_SALT = process.env.IMGPROXY_SALT || ''
export const IMGPROXY_ENABLED = !!(IMGPROXY_URL && IMGPROXY_KEY && IMGPROXY_SALT)
