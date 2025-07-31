import { Router } from 'express'

import { handleFormSubmission, subscribeNewsletter, unsubscribeNewsletter } from '../controllers/form.controller'
import { requireJsonContent } from '../middlewares/contentType.middleware'
import { emailLimiter, moderateLimiter } from '../middlewares/limiters.middleware'

const router = Router()

router.post('/form', requireJsonContent, emailLimiter, moderateLimiter, handleFormSubmission)
router.post('/subscribe-newsletter', requireJsonContent, emailLimiter, moderateLimiter, subscribeNewsletter)
router.post('/unsubscribe-newsletter', requireJsonContent, emailLimiter, moderateLimiter, unsubscribeNewsletter)
router.get('/unsubscribe', requireJsonContent, emailLimiter, moderateLimiter, unsubscribeNewsletter)    

export default router
