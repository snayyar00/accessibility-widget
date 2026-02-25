import { Router } from 'express'

import {
  getDomainAnalyses,
  getPageHtml,
  postAddFix,
  postSuggestedFixes,
  updateAnalysisFixAction,
} from '../controllers/analyses.controller'
import { moderateLimiter } from '../middlewares/limiters.middleware'

const router = Router()

router.get('/domain-analyses', moderateLimiter, getDomainAnalyses)
router.get('/domain-analyses/page-html', moderateLimiter, getPageHtml)
router.put('/domain-analyses/fix-action', moderateLimiter, updateAnalysisFixAction)
router.post('/domain-analyses/suggested-fixes', moderateLimiter, postSuggestedFixes)
router.post('/domain-analyses/add-fix', moderateLimiter, postAddFix)

export default router
