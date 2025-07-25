import { NextFunction, Request, Response } from 'express'

export const requestTimingMiddleware = (req: Request, _: Response, next: NextFunction) => {
  ;(req as any).startTime = Date.now()
  next()
}
