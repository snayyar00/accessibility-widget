import { Router } from 'express';
import { strictLimiter } from '../middlewares/limiters.middleware';
import { isAuthenticated } from '../middlewares/auth.middleware';
import { translateIssues, translateText } from '../controllers/translation.controller';

const router = Router();

router.post('/translate', strictLimiter, isAuthenticated, translateIssues);
router.post('/translate-text', strictLimiter, isAuthenticated, translateText);

export default router;
