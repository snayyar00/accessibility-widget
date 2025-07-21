import { Express } from 'express'

import { parseEnvUrls } from '../utils/env.utils'

export const IS_LOCAL_DEV = !process.env.COOLIFY_URL && process.env.NODE_ENV !== 'production'

export const PORT = process.env.PORT || 3001

export const ALLOWED_ORIGINS = [...parseEnvUrls(process.env.FRONTEND_URL), ...(process.env.COOLIFY_URL ? [process.env.COOLIFY_URL] : []), 'https://www.webability.io', 'https://hoppscotch.webability.io']
export const ALLOWED_OPERATIONS = ['validateToken', 'addImpressionsURL', 'registerInteraction', 'reportProblem', 'updateImpressionProfileCounts']

export const configureServer = (app: Express): void => {
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', true)
  }
}
