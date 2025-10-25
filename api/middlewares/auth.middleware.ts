import { NextFunction, Request, Response } from 'express'

import { Organization } from '../repository/organization.repository'
import getUserLogined, { UserLogined } from '../services/authentication/get-user-logined.service'
import { getOrganizationByDomainService } from '../services/organization/organization.service'
import { getDomainFromRequest } from '../utils/domain.utils'
import { getMatchingFrontendUrl } from '../utils/env.utils'
import { ValidationError } from '../utils/graphql-errors.helper'
import { getOperationName } from '../utils/logger.utils'

export const logAuthenticationFailure = (req: Request & { startTime: 0 }, _: Response, message: string, code: string, status = 401) => {
  const authLog = JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'warn',
    type: 'security',
    method: req.method,
    url: req.url,
    status,
    response_time_ms: Date.now() - req.startTime || 0,
    content_length: 0,
    operation_name: getOperationName(req.body),
    domain: getDomainFromRequest(req),
    error: {
      message,
      code,
    },
  })

  console.warn(authLog)
}

export async function isAuthenticated(req: Request & { organization: Organization; user: UserLogined; startTime: 0 }, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  try {
    const user = await getUserLogined(bearerToken)

    if (!user) {
      logAuthenticationFailure(req, res, 'Authentication fail', 'UNAUTHENTICATED')
      return res.status(401).json({ error: 'Not authenticated' })
    }

    req.user = user

    if (user.currentOrganization) {
      req.organization = user.currentOrganization
    }

    next()
  } catch {
    logAuthenticationFailure(req, res, 'Authentication fail', 'UNAUTHENTICATED')
    return res.status(401).json({ error: 'Not authenticated' })
  }
}

export async function allowedOrganization(req: Request & { organization: Organization | ValidationError; user: UserLogined; startTime: 0 }, res: Response, next: NextFunction) {
  // If organization already loaded by isAuthenticated, reuse it
  let organization = req.organization || null

  if (!organization) {
    const domainFromRequest = getDomainFromRequest(req)
    const allowedFrontendUrl = getMatchingFrontendUrl(domainFromRequest)

    organization = await getOrganizationByDomainService(allowedFrontendUrl)
  }

  const hasOrganization = organization instanceof ValidationError ? null : organization

  if (!hasOrganization) {
    logAuthenticationFailure(req, res, 'Provided domain is not in the list of allowed organizations', 'FORBIDDEN', 403)
    return res.status(403).json({ error: 'Provided domain is not in the list of allowed organizations' })
  }

  req.organization = organization
  next()
}

export async function authenticateApiKey(req: Request & { startTime: 0 }, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!bearerToken) {
    logAuthenticationFailure(req, res, 'API key missing from Authorization header', 'API_KEY_MISSING')
    return res.status(401).json({
      error: 'API key required',
      message: 'Please provide API key in Authorization header as Bearer token',
    })
  }

  const expectedApiKey = process.env.GET_SITE_ROUTE_API_KEY

  if (!expectedApiKey) {
    logAuthenticationFailure(req, res, 'API key not configured on server', 'API_KEY_NOT_CONFIGURED', 500)
    return res.status(500).json({ error: 'Server configuration error' })
  }

  if (bearerToken !== expectedApiKey) {
    logAuthenticationFailure(req, res, 'Invalid API key provided', 'API_KEY_INVALID')
    return res.status(401).json({ error: 'Invalid API key' })
  }

  next()
}
