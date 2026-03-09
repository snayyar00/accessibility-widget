import { Router } from 'express'

import { getDomainAnalyses, getOrCreatePageSummary, getPageHtml, postAddFix, postSuggestedFixes, updateAnalysisFixAction } from '../controllers/analyses.controller'
import { allowedOrganization, isAuthenticated } from '../middlewares/auth.middleware'
import { moderateLimiter } from '../middlewares/limiters.middleware'

const router = Router()

router.get('/domain-analyses', moderateLimiter, allowedOrganization, isAuthenticated, getDomainAnalyses)
router.get('/domain-analyses/page-html', moderateLimiter, allowedOrganization, isAuthenticated, getPageHtml)
router.get('/domain-analyses/page-summary', moderateLimiter, allowedOrganization, isAuthenticated, getOrCreatePageSummary)
router.put('/domain-analyses/fix-action', moderateLimiter, allowedOrganization, isAuthenticated, updateAnalysisFixAction)
router.post('/domain-analyses/suggested-fixes', moderateLimiter, allowedOrganization, isAuthenticated, postSuggestedFixes)
router.post('/domain-analyses/add-fix', moderateLimiter, allowedOrganization, isAuthenticated, postAddFix)

export default router
