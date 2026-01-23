import { Router } from 'express'

import {
  getDomainAnalyses,
  updateAnalysisFixAction,
} from '../controllers/analyses.controller'
import { moderateLimiter } from '../middlewares/limiters.middleware'

const router = Router()

router.get('/domain-analyses', moderateLimiter, getDomainAnalyses)
router.put('/domain-analyses/fix-action', moderateLimiter, updateAnalysisFixAction)

export default router
