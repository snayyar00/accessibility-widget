import { Router } from 'express';
import { moderateLimiter } from '~/middlewares/limiters.middleware';
import { isAuthenticated } from '~/middlewares/auth.middleware';
import { getProblemReports } from '~/controllers/reports.controller';

const router = Router();

router.post('/get-problem-reports', moderateLimiter, isAuthenticated, getProblemReports);

export default router;
