import { Request, Response, NextFunction } from 'express';
import getUserLogined from '~/services/authentication/get-user-logined.service';

export async function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  const { cookies } = req;
  const bearerToken = cookies.token || null;

  try {
    const user = await getUserLogined(bearerToken, res)

    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    (req as any).user = user;
    
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
}
