import { Express } from 'express'

import { parseEnvUrls } from '../utils/env.utils'
import { IS_PROD } from './env'

export const PORT = process.env.PORT || 3001

export const ALLOWED_ORIGINS = [...parseEnvUrls(process.env.FRONTEND_URL), ...(process.env.COOLIFY_URL ? [process.env.COOLIFY_URL] : []), 'https://www.webability.io']
export const ALLOWED_OPERATIONS = ['validateToken', 'addImpressionsURL', 'registerInteraction', 'reportProblem', 'updateImpressionProfileCounts']

export const configureServer = (app: Express): void => {
  if (IS_PROD) {
    app.set('trust proxy', true) // For Cloudflare
    app.disable('x-powered-by')
  }
}
