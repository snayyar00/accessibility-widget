import { Response } from 'express';

export const COOKIE_NAME = {
  TOKEN: 'token',
};

const COOKIE_DOMAIN = process.env.FRONTEND_ROOT || undefined;

export function setAuthenticationCookie(res: Response, token: string): void {
  // Set secure flag in production environment to prevent sending cookies over HTTP
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.cookie(COOKIE_NAME.TOKEN, `Bearer ${token}`, { 
    maxAge: 60 * 60 * 24 * 1000, 
    httpOnly: true,
    secure: isProduction, // Enable secure flag in production
    sameSite: 'strict', // Add sameSite protection as an additional security measure
    domain: COOKIE_DOMAIN
  });
}

export function clearCookie(res: Response, key: string): void {
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.clearCookie(key, {
    secure: isProduction,
    sameSite: 'strict',
    domain: COOKIE_DOMAIN
  });
}
