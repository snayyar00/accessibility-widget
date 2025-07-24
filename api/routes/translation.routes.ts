import { Router } from 'express'

import { translateIssues, translateText } from '../controllers/translation.controller'
import { allowedOrganization, isAuthenticated } from '../middlewares/auth.middleware'
import { strictLimiter } from '../middlewares/limiters.middleware'

const router = Router()

router.post('/translate', strictLimiter, allowedOrganization, isAuthenticated, translateIssues)
router.post('/translate-text', strictLimiter, allowedOrganization, isAuthenticated, translateText)

export default router
