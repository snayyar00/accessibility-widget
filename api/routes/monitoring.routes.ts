import { Router } from 'express'
import { handleMonitoringNotification } from '../controllers/monitoring.controller'
import { moderateLimiter } from '../middlewares/limiters.middleware'

const router = Router()

// Public endpoint for monitoring service to send notifications
// Uses API key authentication (handled in controller)
router.post(
  '/notify',
  moderateLimiter, // Use existing rate limiter
  handleMonitoringNotification
)

export default router