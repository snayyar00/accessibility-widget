import { Router } from 'express'

import { searchSiteByURL, checkSiteScript } from '../controllers/sites.controller'
import { authenticateApiKey, isAuthenticated } from '../middlewares/auth.middleware'
import { moderateLimiter } from '../middlewares/limiters.middleware'

const router = Router()

// Route to search site by URL query parameter
router.get('/get-site', moderateLimiter, authenticateApiKey, searchSiteByURL)

// Route to check if accessibility widget script is installed
router.post('/check-script', moderateLimiter, isAuthenticated, checkSiteScript)

export default router
