import chalk from 'chalk'
import { Request, Response } from 'express'
import morgan from 'morgan'

import { IS_LOCAL } from '../config/env'
import { getDomainFromRequest } from '../utils/domain.utils'
import { getOperationName } from '../utils/logger.utils'

morgan.token('operation_name', (req) => getOperationName((req as Request).body))

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`

  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
}

const gdprSafeJsonFormat = (tokens: any, req: Request, res: Response) => {
  const contentLength = Number(tokens.res(req, res, 'content-length')) || 0
  const status = Number(tokens.status(req, res))

  // Set log level based on HTTP status code
  let level = 'info'

  if (status >= 500) level = 'error'
  else if (status >= 400) level = 'warn'
  else if (status >= 300) level = 'info'

  const logObj = {
    timestamp: new Date().toISOString(),
    level,
    type: 'access',
    method: tokens.method(req, res),
    url: tokens.url(req, res),
    status,
    content_length: contentLength,
    response_time_ms: Number(tokens['response-time'](req, res)),
    operation_name: tokens.operation_name(req, res),
    domain: getDomainFromRequest(req),
  }

  if (IS_LOCAL) {
    let statusColor = chalk.green

    if (logObj.status >= 500) statusColor = chalk.red
    else if (logObj.status >= 400) statusColor = chalk.yellow
    else if (logObj.status >= 300) statusColor = chalk.cyan

    return [
      chalk.gray(logObj.timestamp),
      chalk.blue(logObj.method),
      chalk.white(logObj.url),
      statusColor(String(logObj.status)),
      chalk.magenta(`${logObj.response_time_ms}ms`),
      chalk.hex('#6c8eae')(`${logObj.operation_name || '-'}`),
      chalk.hex('#a3a3a3')(`${formatBytes(contentLength)}`),
      chalk.hex('#bfa700')(`${logObj.domain || '-'}`),
    ].join(' ')
  }

  return JSON.stringify(logObj)
}

export const configureMorgan = () => {
  return morgan(gdprSafeJsonFormat)
}
