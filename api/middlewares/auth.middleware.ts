import { NextFunction, Request, Response } from 'express'

import getUserLogined from '../services/authentication/get-user-logined.service'
import { getOrganizationByDomainService } from '../services/organization/organization.service'
import { extractClientDomain } from '../utils/domain.utils'
import { getMatchingFrontendUrl } from '../utils/env.utils'
import { ValidationError } from '../utils/graphql-errors.helper'
import { getOperationName } from '../utils/logger.utils'

export const logAuthenticationFailure = (req: Request, _: Response, message: string, code: string, status = 401) => {
  const authLog = JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'warn',
    type: 'security',
    method: req.method,
    url: req.url,
    status,
    response_time_ms: Date.now() - (req as any).startTime || 0,
    content_length: 0,
    operation_name: getOperationName(req.body),
    domain: extractClientDomain(req),
    error: {
      message,
      code,
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

export async function allowedOrganization(req: Request, res: Response, next: NextFunction) {
  const clientDomain = extractClientDomain(req)
  const allowedFrontendUrl = getMatchingFrontendUrl(clientDomain)

  const organization = await getOrganizationByDomainService(allowedFrontendUrl)

  const hasOrganization = organization instanceof ValidationError ? null : organization

  if (!hasOrganization) {
    logAuthenticationFailure(req, res, 'Provided domain is not in the list of allowed organizations', 'FORBIDDEN', 403)
    return res.status(403).json({ error: 'Provided domain is not in the list of allowed organizations' })
  }

  ;(req as any).organization = organization
  next()
}
