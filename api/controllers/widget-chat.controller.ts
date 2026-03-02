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

const WIDGET_CHAT_TIMEOUT_MS = 10_000

const DEFAULT_TIMEOUT_REPLY = "I'm taking a bit longer than usual. Please try again in a moment."

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('WIDGET_CHAT_TIMEOUT')), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      },
    )
  })
}

const PROFILE_KEYS = [
  'adhd',
  'seizure-epileptic',
  'cognitive-learning',
  'visually-impaired',
  'dyslexia-font',
  'color-blind',
  'blind',
  'motor-impaired',
] as const

const TOOL_KEYS = [
  'highlight-title',
  'highlight-links',
  'letter-spacing',
  'line-height',
  'font-weight',
  'readable-font',
  'readable-guide',
  'stop-animations',
  'big-cursor',
  'screen-reader',
  'darkMode',
  'voiceNavigation',
  'keyboard-navigation',
  'page-structure',
  'monochrome',
  'saturation',
  'contrast',
] as const

const WIDGET_POSITIONS = [
  'bottom-left',
  'bottom-right',
  'top-left',
  'top-right',
  'center-left',
  'center-right',
  'bottom-center',
  'top-center',
] as const

const PAGE_COLOR_SECTIONS = ['text', 'title', 'background'] as const
const PAGE_COLOR_VALUES = ['white', 'black', 'orange', 'blue', 'red', 'green', 'default'] as const

/** Allowed "mode" values for tools that have cycling options (CYCLING BUTTONS in prompt). */
const TOOL_MODES: Record<string, readonly string[]> = {
  contrast: ['light-contrast', 'high-contrast', 'dark-contrast'],
  saturation: ['low-saturation', 'high-saturation'],
  'screen-reader': ['normal', 'fast', 'slow'],
  'letter-spacing': ['light', 'medium', 'wide'],
  'line-height': ['light', 'medium', 'loose'],
}

type ProfileKey = (typeof PROFILE_KEYS)[number]
type ToolKey = (typeof TOOL_KEYS)[number]
type WidgetPosition = (typeof WIDGET_POSITIONS)[number]
type PageColorSection = (typeof PAGE_COLOR_SECTIONS)[number]
type PageColorValue = (typeof PAGE_COLOR_VALUES)[number]

type WidgetCommandType =
  | 'open_menu'
  | 'close_menu'
  | 'profile'
  | 'tool'
  | 'language'
  | 'font_size'
  | 'widget_position'
  | 'oversize_widget'
  | 'menu_theme'
  | 'reset'
  | 'widget_visibility'
  | 'page_color'
  | 'none'

type WidgetCommand =
  | { type: 'open_menu' }
  | { type: 'close_menu' }
  | { type: 'profile'; value: ProfileKey; enabled: boolean }
  | { type: 'tool'; value: ToolKey; enabled: boolean; mode?: string }
  | { type: 'language'; value: string }
  | { type: 'font_size'; value?: number; step?: 'increase' | 'decrease' }
  | { type: 'widget_position'; value: WidgetPosition }
  | { type: 'oversize_widget'; enabled: boolean }
  | { type: 'menu_theme'; value: 'dark' | 'light' }
  | { type: 'reset' }
  | { type: 'widget_visibility'; enabled: boolean }
  | { type: 'page_color'; section: PageColorSection; value: PageColorValue }
  | { type: 'none' }

export interface WidgetChatAction {
  command: WidgetCommand
  reply?: string
}

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

function parseAndValidateActions(raw: string): WidgetChatAction[] {
  const trimmed = raw.trim()
  if (!trimmed) {
    throw new Error('Empty AI response')
  }

  let jsonText = trimmed

  // If the model returned multiple objects back-to-back, join them into a JSON array
  if (!trimmed.startsWith('[')) {
    jsonText = `[${trimmed.replace(/}\s*{/g, '},{')}]`
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch (e) {
    throw new Error('AI response is not valid JSON')
  }

  const items = Array.isArray(parsed) ? parsed : [parsed]

  const actions: WidgetChatAction[] = items.map((item, index) => {
    if (typeof item !== 'object' || item === null) {
      throw new Error(`AI response item at index ${index} is not an object`)
    }

    const obj = item as { command?: any; reply?: unknown }
    const { command, reply } = obj

    if (!command || typeof command !== 'object') {
      throw new Error(`AI response item at index ${index} is missing a valid "command" object`)
    }

    const type = command.type as WidgetCommandType

    switch (type) {
      case 'open_menu':
      case 'close_menu':
      case 'reset':
      case 'none':
        break

      case 'profile': {
        if (!PROFILE_KEYS.includes(command.value)) {
          throw new Error(`Invalid profile value "${command.value}" at index ${index}`)
        }
        if (typeof command.enabled !== 'boolean') {
          throw new Error(`Profile command at index ${index} must include boolean "enabled"`)
        }
        break
      }

      case 'tool': {
        if (!TOOL_KEYS.includes(command.value)) {
          throw new Error(`Invalid tool value "${command.value}" at index ${index}`)
        }
        if (typeof command.enabled !== 'boolean') {
          throw new Error(`Tool command at index ${index} must include boolean "enabled"`)
        }
        const allowedModes = TOOL_MODES[command.value]
        if (allowedModes) {
          if (command.enabled && command.mode !== undefined && command.mode !== null) {
            const mode = typeof command.mode === 'string' ? command.mode.trim() : String(command.mode)
            if (!allowedModes.includes(mode)) {
              throw new Error(
                `Invalid mode "${command.mode}" for tool "${command.value}" at index ${index}. Allowed: ${allowedModes.join(', ')}`,
              )
            }
          }
        }
        break
      }

      case 'language': {
        if (typeof command.value !== 'string' || !command.value.trim()) {
          throw new Error(`Language command at index ${index} must include non-empty "value"`)
        }
        break
      }

      case 'font_size': {
        const hasValue = typeof command.value === 'number'
        const hasStep = typeof command.step === 'string'
        if (!hasValue && !hasStep) {
          throw new Error(`font_size command at index ${index} must include "value" or "step"`)
        }
        if (hasValue && (command.value < 1 || command.value > 2)) {
          throw new Error(`font_size value at index ${index} must be between 1 and 2`)
        }
        if (hasStep && !['increase', 'decrease'].includes(command.step)) {
          throw new Error(`font_size step at index ${index} must be "increase" or "decrease"`)
        }
        break
      }

      case 'widget_position': {
        if (!WIDGET_POSITIONS.includes(command.value)) {
          throw new Error(`Invalid widget_position value "${command.value}" at index ${index}`)
        }
        break
      }

      case 'oversize_widget':
      case 'widget_visibility': {
        if (typeof command.enabled !== 'boolean') {
          throw new Error(`"${type}" command at index ${index} must include boolean "enabled"`)
        }
        break
      }

      case 'menu_theme': {
        if (!['dark', 'light'].includes(command.value)) {
          throw new Error(`menu_theme value at index ${index} must be "dark" or "light"`)
        }
        break
      }

      case 'page_color': {
        if (!PAGE_COLOR_SECTIONS.includes(command.section)) {
          throw new Error(`Invalid page_color section "${command.section}" at index ${index}`)
        }
        if (!PAGE_COLOR_VALUES.includes(command.value)) {
          throw new Error(`Invalid page_color value "${command.value}" at index ${index}`)
        }
        break
      }

      default:
        throw new Error(`Unknown command type "${String(type)}" at index ${index}`)
    }

    const safeReply = typeof reply === 'string' ? reply : undefined
    return { command: command as WidgetCommand, reply: safeReply }
  })

  return actions
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

    let rawReply = ''

    try {
      // Primary model via OpenRouter (10s timeout)
      const completion = await withTimeout(
        openrouter.chat.completions.create({
          model: 'google/gemini-2.5-flash-lite',
          messages: messagesForModel,
        }),
        WIDGET_CHAT_TIMEOUT_MS,
      )

      rawReply =
        completion.choices?.[0]?.message?.content && typeof completion.choices[0].message.content === 'string'
          ? completion.choices[0].message.content
          : ''
    } catch (primaryError) {
      if ((primaryError as Error)?.message === 'WIDGET_CHAT_TIMEOUT') {
        console.warn('Widget chat: primary model request timed out')
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.status(200).json({
          reply: DEFAULT_TIMEOUT_REPLY,
          actions: [{ command: { type: 'none' }, reply: DEFAULT_TIMEOUT_REPLY }],
        })
        return
      }

      console.warn('Primary model failed, falling back to openai/gpt-4o-mini for widget chat')

      try {
        const fallbackCompletion = await withTimeout(
          openrouter.chat.completions.create({
            model: 'openai/gpt-4o-mini',
            messages: messagesForModel,
          }),
          WIDGET_CHAT_TIMEOUT_MS,
        )

        rawReply =
          fallbackCompletion.choices?.[0]?.message?.content &&
          typeof fallbackCompletion.choices[0].message.content === 'string'
            ? fallbackCompletion.choices[0].message.content
            : ''
      } catch (fallbackError) {
        if ((fallbackError as Error)?.message === 'WIDGET_CHAT_TIMEOUT') {
          console.warn('Widget chat: fallback model request timed out')
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.status(200).json({
            reply: DEFAULT_TIMEOUT_REPLY,
            actions: [{ command: { type: 'none' }, reply: DEFAULT_TIMEOUT_REPLY }],
          })
          return
        }
        throw fallbackError
      }
    }

    const actions = parseAndValidateActions(rawReply)

    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.status(200).json({ reply: rawReply, actions })
  } catch (error) {
    console.error('Widget chat API error:', error)
    res.status(500).json({
      error: 'An error occurred while processing your message.',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
    })
  }
}
