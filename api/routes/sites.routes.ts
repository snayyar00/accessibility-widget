import { Router } from 'express'

import { searchSiteByURL } from '../controllers/sites.controller'

const router = Router()

// Route to search site by URL query parameter
router.get('/api/sites/search', searchSiteByURL)

export default router
