import { Request, Response, NextFunction } from 'express';

export const requestTimingMiddleware = (req: Request, _: Response, next: NextFunction) => {
  (req as any).startTime = Date.now();
  next();
};