import { Router } from 'express'

import { getSiteWidgetSettings, updateSiteWidgetSettings } from '../controllers/widget-settings.controller'
import { sendWidgetInstallationInstructionsController } from '../controllers/widget-installation.controller'
import { allowedOrganization, isAuthenticated } from '../middlewares/auth.middleware'
import { moderateLimiter } from '../middlewares/limiters.middleware'
import { validateBody } from '../middlewares/validation.middleware'
import { validateWidgetSettings } from '../validations/widget.validation'

const router = Router()

router.post('/update-site-widget-settings', moderateLimiter, allowedOrganization, isAuthenticated, validateBody(validateWidgetSettings), updateSiteWidgetSettings)

router.post(
  '/get-site-widget-settings',
  moderateLimiter,
  isAuthenticated,
  validateBody((body) => validateWidgetSettings({ site_url: body.site_url, settings: null })),
  getSiteWidgetSettings,
)

// Widget installation instructions endpoint
router.post('/send-installation-instructions', moderateLimiter, sendWidgetInstallationInstructionsController)

export default router
