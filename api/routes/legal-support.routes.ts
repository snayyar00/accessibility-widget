import { Router } from 'express'

import { sendLegalSupportRequest } from '../controllers/legal-support.controller'
import { allowedOrganization, isAuthenticated } from '../middlewares/auth.middleware'
import { moderateLimiter } from '../middlewares/limiters.middleware'

const router = Router()

router.post('/request-support', moderateLimiter, allowedOrganization, isAuthenticated, sendLegalSupportRequest)

export default router

