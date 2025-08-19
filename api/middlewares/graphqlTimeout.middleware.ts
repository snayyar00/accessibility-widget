import { NextFunction, Request, Response } from 'express'

/**
 * Middleware to set timeout for /graphql requests.
 * Increases timeout to 2 minutes for getAccessibilityReport queries.
 */
export function graphqlTimeoutMiddleware(req: Request, res: Response, next: NextFunction) {
  const { body } = req
  let timeout = 70000

  if (body && body.query && body.query.includes('getAccessibilityReport')) {
    timeout = 180000 // 3 minutes for accessibility report
  }

  req.setTimeout(timeout)
  res.setTimeout(timeout)

  next()
}
