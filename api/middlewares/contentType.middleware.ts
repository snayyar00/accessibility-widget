import { Request, Response, NextFunction } from 'express';

export function requireJsonContent(req: Request, res: Response, next: NextFunction) {
    
  if (req.is('application/json')) {
    return next();
  }

  res.status(415).json({ error: 'Unsupported Media Type. Use application/json.' });
}
