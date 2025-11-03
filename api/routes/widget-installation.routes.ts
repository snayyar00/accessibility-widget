import { Router } from 'express'

import { sendWidgetInstallationInstructionsController } from '../controllers/widget-installation.controller'

const router = Router()

// POST /api/widget-installation/send-instructions
router.post('/send-instructions', sendWidgetInstallationInstructionsController)

export default router
