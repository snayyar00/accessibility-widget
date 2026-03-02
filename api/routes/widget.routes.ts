import { Router } from 'express'

import { sendWidgetInstallationInstructionsController } from '../controllers/widget-installation.controller'
import {
  deleteWidgetLogo,
  deleteWidgetIcon,
  uploadMiddleware,
  uploadIconMiddleware,
  uploadWidgetLogo,
  uploadWidgetIcon,
} from '../controllers/widget-logo.controller'
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

// Widget logo & icon upload endpoints
router.post('/upload-logo', moderateLimiter, allowedOrganization, isAuthenticated, uploadMiddleware, uploadWidgetLogo)
router.post('/delete-logo', moderateLimiter, allowedOrganization, isAuthenticated, deleteWidgetLogo)
router.post('/upload-widget-icon', moderateLimiter, allowedOrganization, isAuthenticated, uploadIconMiddleware, uploadWidgetIcon)
router.post('/delete-widget-icon', moderateLimiter, allowedOrganization, isAuthenticated, deleteWidgetIcon)

// Widget installation instructions endpoint (auth required so org SMTP is used when configured)
router.post('/send-installation-instructions', moderateLimiter, allowedOrganization, isAuthenticated, sendWidgetInstallationInstructionsController)

export default router
