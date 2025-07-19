import { Request, Response, NextFunction } from 'express';
import accessLogStream from '~/libs/logger/stream';
import { getOperationName } from '~/utils/logger.utils';
import getUserLogined from '~/services/authentication/get-user-logined.service';

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
    error: {
      message: message,
      code: code,
      stack: process.env.NODE_ENV === 'development' ? undefined : undefined,
    },
  });
  
  if (accessLogStream) {
    accessLogStream.write(authLog + '\n');
  } else {
    // console.log(authLog);
  }
};

export async function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  const { cookies } = req;
  const bearerToken = cookies.token || null;

  try {
    const user = await getUserLogined(bearerToken, res);

    if (!user) {
      logAuthenticationFailure(req, res, 'Authentication fail', 'UNAUTHENTICATED');
      return res.status(401).json({ error: 'Not authenticated' });
    }

    (req as any).user = user;

    next();
  } catch (e) {
    logAuthenticationFailure(req, res, 'Authentication fail', 'UNAUTHENTICATED');
    return res.status(401).json({ error: 'Not authenticated' });
  }
}
