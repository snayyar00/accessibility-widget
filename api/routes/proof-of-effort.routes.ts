import { Router } from 'express'

import { sendProofOfEffortToolkit } from '../controllers/proof-of-effort.controller'
import { allowedOrganization, isAuthenticated } from '../middlewares/auth.middleware'
import { moderateLimiter } from '../middlewares/limiters.middleware'

const router = Router()

router.post('/send-toolkit', moderateLimiter, allowedOrganization, isAuthenticated, sendProofOfEffortToolkit)

export default router 