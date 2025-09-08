import { Router } from 'express'

import { searchSiteByURL } from '../controllers/sites.controller'
import { authenticateApiKey } from '../middlewares/auth.middleware'
import { moderateLimiter } from '../middlewares/limiters.middleware'

const router = Router()

// Route to search site by URL query parameter
router.get('/get-site', moderateLimiter, authenticateApiKey, searchSiteByURL)

export default router
