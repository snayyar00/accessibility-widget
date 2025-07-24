import { Express } from 'express'

import { parseEnvUrls } from '../utils/env.utils'

export const IS_LOCAL = process.env.NODE_ENV === 'local'
export const IS_DEV = process.env.NODE_ENV === 'development'
export const IS_PROD = process.env.NODE_ENV === 'production'

export const PORT = process.env.PORT || 3001

export const ALLOWED_ORIGINS = [...parseEnvUrls(process.env.FRONTEND_URL), ...(process.env.COOLIFY_URL ? [process.env.COOLIFY_URL] : []), 'https://www.webability.io']
export const ALLOWED_OPERATIONS = ['validateToken', 'addImpressionsURL', 'registerInteraction', 'reportProblem', 'updateImpressionProfileCounts']

export const configureServer = (app: Express): void => {
  if (IS_PROD) {
    // For Cloudflare
    app.set('trust proxy', true)
  }
}
