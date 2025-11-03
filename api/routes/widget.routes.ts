import { Router } from 'express'

import { sendWidgetInstallationInstructionsController } from '../controllers/widget-installation.controller'
import { deleteWidgetLogo, uploadMiddleware, uploadWidgetLogo } from '../controllers/widget-logo.controller'
import { getSiteWidgetSettings, updateSiteWidgetSettings } from '../controllers/widget-settings.controller'
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

// Widget logo upload endpoints
router.post('/upload-logo', moderateLimiter, allowedOrganization, isAuthenticated, uploadMiddleware, uploadWidgetLogo)
router.post('/delete-logo', moderateLimiter, allowedOrganization, isAuthenticated, deleteWidgetLogo)

// Widget installation instructions endpoint
router.post('/send-installation-instructions', moderateLimiter, sendWidgetInstallationInstructionsController)

export default router
