import OpenAI from 'openai'
import { Request, Response } from 'express'

import { WIDGET_CHAT_SYSTEM_PROMPT } from '../prompts/widget-chat.prompt'

if (!process.env.OPENROUTER_API_KEY) {
  throw new Error('OPENROUTER_API_KEY environment variable is required for widget chat')
}

const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': 'Webability.io',
    'X-Title': 'Webability.io - Widget Chat',
  },
})

export interface WidgetChatRequestBody {
  /** Current user message (required). */
  message: string
  /** Optional conversation history for multi-turn. Each item: { role: 'user' | 'assistant', content: string } */
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>
  /** Optional site URL where the widget is embedded (for context). */
  siteUrl?: string
  /** Optional language hint (e.g. 'en', 'es') so the model can respond in that language. */
  language?: string
}

/**
 * POST /widget/chat
 * AI chat endpoint for the embeddable widget (voice and text).
 * Receives a message (and optional history), sends to the model with the widget system prompt,
 * returns a single JSON response { reply } for the widget to display or speak (TTS).
 */
export async function handleWidgetChatRequest(req: Request, res: Response) {
  try {
    const body = req.body as WidgetChatRequestBody
    const { message, messages: history = [], siteUrl, language } = body

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Missing or invalid "message" in request body.' })
      return
    }

    const trimmedMessage = message.trim()
    if (!trimmedMessage) {
      res.status(400).json({ error: 'Message cannot be empty.' })
      return
    }

    let systemPrompt = WIDGET_CHAT_SYSTEM_PROMPT
    if (siteUrl) {
      systemPrompt += `\n\nCURRENT SITE: The visitor is on this website: ${siteUrl}. You can refer to "this site" when giving directions.`
    }
    if (language) {
      systemPrompt += `\n\nPREFERRED LANGUAGE: Prefer responding in language code "${language}" if the user writes in that language.`
    }

    const chatMessages = [
      ...history.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      })),
      { role: 'user' as const, content: trimmedMessage },
    ].filter((m) => m.role !== 'system') as Array<{ role: 'user' | 'assistant'; content: string }>

    const messagesForModel = [
      { role: 'system' as const, content: systemPrompt },
      ...chatMessages.map((m) => ({ role: m.role, content: m.content })),
    ]

    let reply = ''

    try {
      // Primary model via OpenRouter
      const completion = await openrouter.chat.completions.create({
        model: 'google/gemini-2.5-flash-lite',
        messages: messagesForModel,
      })

      reply =
        completion.choices?.[0]?.message?.content && typeof completion.choices[0].message.content === 'string'
          ? completion.choices[0].message.content
          : ''
    } catch (primaryError) {
      console.warn('Primary model failed, falling back to openai/gpt-4o-mini for widget chat')

      const fallbackCompletion = await openrouter.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: messagesForModel,
      })

      reply =
        fallbackCompletion.choices?.[0]?.message?.content &&
        typeof fallbackCompletion.choices[0].message.content === 'string'
          ? fallbackCompletion.choices[0].message.content
          : ''
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.status(200).json({ reply })
  } catch (error) {
    console.error('Widget chat API error:', error)
    res.status(500).json({
      error: 'An error occurred while processing your message.',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
    })
  }
}
