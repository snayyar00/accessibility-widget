import { Router } from 'express';
import { generateAiSummary } from '../controllers/ai-summary.controller';

const router = Router();

// Test endpoint
router.get('/api/ai-summary/test', (req, res) => {
  res.json({ message: 'AI Summary API is working!' });
});

router.post('/api/ai-summary', generateAiSummary);

export default router;
