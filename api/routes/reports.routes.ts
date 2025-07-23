import { Router } from 'express'

import { getProblemReports } from '../controllers/reports.controller'
import { allowedOrganization, isAuthenticated } from '../middlewares/auth.middleware'
import { moderateLimiter } from '../middlewares/limiters.middleware'

const router = Router()

router.post('/get-problem-reports', moderateLimiter, allowedOrganization, isAuthenticated, getProblemReports)

export default router
