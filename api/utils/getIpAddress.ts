import { Request } from 'express';

const getClientIP = (req: Request): string => {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
      return ip.trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
};

export default getClientIP;