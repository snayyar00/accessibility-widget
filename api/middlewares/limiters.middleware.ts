// Centralized rate limiters for Express routes
// Use these to protect sensitive or abuse-prone endpoints

import rateLimit from 'express-rate-limit';

// Strict limiter: for financial, Stripe, and other sensitive operations
export const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: { error: 'Too many requests, please try again later.' }
});

// Moderate limiter: for user settings, reports, and less sensitive endpoints
export const moderateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});

// Coupon limiter: for coupon validation endpoints
export const couponLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: { error: 'Too many coupon validation requests, please try again later.' }
});
