import { Router } from 'express'

import { handleChatRequest } from '../controllers/chat.controller'

const router = Router()

// Chat endpoint for AI accessibility assistant
router.post('/chat', handleChatRequest)

export default router
