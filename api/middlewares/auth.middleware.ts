import { NextFunction, Request, Response } from 'express'

import getUserLogined from '../services/authentication/get-user-logined.service'
import { extractClientDomain } from '../utils/domain.utils'
import { getOperationName } from '../utils/logger.utils'

export const logAuthenticationFailure = (req: Request, _: Response, message: string, code: string) => {
  const authLog = JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'warn',
    type: 'security',
    method: req.method,
    url: req.url,
    status: 401,
    response_time_ms: Date.now() - (req as any).startTime || 0,
    content_length: 0,
    operation_name: getOperationName(req.body),
    domain: extractClientDomain(req),
    error: {
      message,
      code,
      stack: process.env.NODE_ENV === 'development' ? undefined : undefined,
    },
  })

  console.warn(authLog)
}

export async function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  try {
    const user = await getUserLogined(bearerToken)

    if (!user) {
      logAuthenticationFailure(req, res, 'Authentication fail', 'UNAUTHENTICATED')
      return res.status(401).json({ error: 'Not authenticated' })
    }

    ;(req as any).user = user

    next()
  } catch {
    logAuthenticationFailure(req, res, 'Authentication fail', 'UNAUTHENTICATED')
    return res.status(401).json({ error: 'Not authenticated' })
  }
}
