import { Router } from 'express'

import { getProblemReports } from '../controllers/reports.controller'
import { isAuthenticated } from '../middlewares/auth.middleware'
import { moderateLimiter } from '../middlewares/limiters.middleware'

const router = Router()

router.post('/get-problem-reports', moderateLimiter, isAuthenticated, getProblemReports)

export default router
