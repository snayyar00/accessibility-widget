import { Router } from 'express'

import { translateIssues, translateText } from '../controllers/translation.controller'
import { isAuthenticated } from '../middlewares/auth.middleware'
import { strictLimiter } from '../middlewares/limiters.middleware'

const router = Router()

router.post('/translate', strictLimiter, isAuthenticated, translateIssues)
router.post('/translate-text', strictLimiter, isAuthenticated, translateText)

export default router
