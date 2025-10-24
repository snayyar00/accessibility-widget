export const IS_LOCAL = process.env.NODE_ENV === 'local'
export const IS_DEV = process.env.NODE_ENV === 'development'
export const IS_PROD = process.env.NODE_ENV === 'production'

export const IMGPROXY_URL = process.env.IMGPROXY_URL || ''
export const IMGPROXY_KEY = process.env.IMGPROXY_KEY || ''
export const IMGPROXY_SALT = process.env.IMGPROXY_SALT || ''
export const IMGPROXY_ENABLED = !!(IMGPROXY_URL && IMGPROXY_KEY && IMGPROXY_SALT)
