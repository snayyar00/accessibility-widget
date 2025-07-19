import { Router } from 'express';
import { requireJsonContent } from '../middlewares/contentType.middleware';
import { emailLimiter, moderateLimiter } from '../middlewares/limiters.middleware';
import { handleFormSubmission, subscribeNewsletter } from '../controllers/form.controller';

const router = Router();

router.post('/form', requireJsonContent, emailLimiter, moderateLimiter, handleFormSubmission);
router.post('/subscribe-newsletter', requireJsonContent, emailLimiter, moderateLimiter, subscribeNewsletter);

export default router;
