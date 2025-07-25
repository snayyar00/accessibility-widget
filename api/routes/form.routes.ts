import { Router } from 'express'

import { handleFormSubmission, subscribeNewsletter } from '../controllers/form.controller'
import { requireJsonContent } from '../middlewares/contentType.middleware'
import { emailLimiter, moderateLimiter } from '../middlewares/limiters.middleware'

const router = Router()

router.post('/form', requireJsonContent, emailLimiter, moderateLimiter, handleFormSubmission)
router.post('/subscribe-newsletter', requireJsonContent, emailLimiter, moderateLimiter, subscribeNewsletter)

export default router
