import { Request, Response } from 'express'
import rateLimit from 'express-rate-limit'

function getRealIp(req: Request, _res: Response): string {
  let realIp = (req.headers['cf-connecting-ip'] as string) || (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip

  if (realIp) {
    if (realIp.includes('::ffff:')) {
      realIp = realIp.replace('::ffff:', '')
    }

    if (realIp.includes(':') && !realIp.includes('.')) {
      realIp = realIp.toLowerCase().replace(/^0+/, '').replace(/:0+/g, ':')
    }
  }

  return realIp || 'unknown'
}

// Strict limiter: for financial, Stripe, and other sensitive operations
export const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  keyGenerator: getRealIp,
  message: { error: 'Too many requests, please try again later.' },
  validate: false,
})

// Moderate limiter: for user settings, reports, and less sensitive endpoints
export const moderateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100,
  keyGenerator: getRealIp,
  message: { error: 'Too many requests, please try again later.' },
  validate: false,
})

// Email limiter
export const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req: Request, res: Response) => req.body?.email || getRealIp(req, res),
  message: { error: 'Too many emails sent to this address, please try again later.' },
  validate: false,
})
