import { Request } from 'express';
import rateLimit from 'express-rate-limit';

// Strict limiter: for financial, Stripe, and other sensitive operations
export const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: { error: 'Too many requests, please try again later.' },
});

// Moderate limiter: for user settings, reports, and less sensitive endpoints
export const moderateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
});

// Email limiter
export const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req: Request) => req.body?.email || req.ip,
  message: { error: 'Too many emails sent to this address, please try again later.' },
});
