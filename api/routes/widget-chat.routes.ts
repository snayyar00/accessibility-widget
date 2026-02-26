import { Router } from 'express'

import { handleWidgetChatRequest } from '../controllers/widget-chat.controller'
import { moderateLimiter } from '../middlewares/limiters.middleware'

const router = Router()

/**
 * POST /widget/chat
 * AI voice and text chat for the embeddable accessibility widget.
 * Body: { message: string, currentUrl?: string, messages?: Array<{ role, content }>, language?: string }
 * (currentUrl = current page URL; widget should always send it. siteUrl supported as fallback.)
 * Response: { reply: string; actions: Array<{ command: WidgetCommand; reply?: string }> }
 */
router.post('/widget/chat', moderateLimiter, handleWidgetChatRequest)

export default router
