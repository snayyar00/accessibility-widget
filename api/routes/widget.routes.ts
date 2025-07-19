import { Router } from 'express'

import { getSiteWidgetSettings, updateSiteWidgetSettings } from '../controllers/widget-settings.controller'
import { isAuthenticated } from '../middlewares/auth.middleware'
import { moderateLimiter } from '../middlewares/limiters.middleware'
import { validateBody } from '../middlewares/validation.middleware'
import { validateWidgetSettings } from '../validations/widget.validation'

const router = Router()

router.post('/update-site-widget-settings', moderateLimiter, isAuthenticated, validateBody(validateWidgetSettings), updateSiteWidgetSettings)

router.post(
  '/get-site-widget-settings',
  moderateLimiter,
  isAuthenticated,
  validateBody((body) => validateWidgetSettings({ site_url: body.site_url, settings: null })),
  getSiteWidgetSettings,
)

export default router
