import { Router } from 'express'

import { proxyImage } from '../controllers/image-proxy.controller'
import { isAuthenticated } from '../middlewares/auth.middleware'
import { moderateLimiter } from '../middlewares/limiters.middleware'

const router = Router()

// Route to proxy image fetch (avoids CORS issues)
// Uses user authentication (Bearer token) since this is called from authenticated user sessions
router.post('/proxy-image', moderateLimiter, isAuthenticated, proxyImage)

export default router

