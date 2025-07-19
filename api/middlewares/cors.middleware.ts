import cors from 'cors'
import { NextFunction, Request, Response } from 'express'

import { ALLOWED_OPERATIONS, ALLOWED_ORIGINS, IS_LOCAL_DEV } from '../config/server.config'

export function dynamicCors(req: Request, res: Response, next: NextFunction) {
  const corsOptions = {
    optionsSuccessStatus: 200,
    credentials: true,

    origin: (origin: any, callback: any) => {
      // Allow local development
      if (IS_LOCAL_DEV) {
        return callback(null, true)
      }

      // Allow preflight OPTIONS requests
      if (req.method === 'OPTIONS') {
        return callback(null, true)
      }

      // Allow predefined origins
      if (ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true)
      }

      // Allow specific GraphQL operations (widget operations)
      if (req.body && ALLOWED_OPERATIONS.includes(req.body.operationName)) {
        return callback(null, true)
      }

      // Allow GET requests to root without Origin (for health checks, browsers, etc.)
      if (!origin && req.method === 'GET' && req.path === '/') {
        return callback(null, true)
      }

      // Reject all other origins
      callback(null, false)
    },

    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  }

  cors(corsOptions)(req, res, next)
}
