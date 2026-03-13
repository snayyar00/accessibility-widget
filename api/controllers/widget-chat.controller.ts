import { Request, Response } from 'express'
import OpenAI from 'openai'

import { WIDGET_CHAT_SYSTEM_PROMPT } from '../prompts/widget-chat.prompt'
import { getPageHtmlByUrl, getPageSummaryByUrl, updatePageSummary } from '../repository/pageCache.repository'
import { extractTextFromHtml, generatePageSummary } from '../services/pageSummary/pageSummary.service'

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

// Timeout for each model call (primary and fallback). Increased to reduce "request timed out" warnings
// while still keeping the widget responsive for end users.
const WIDGET_CHAT_TIMEOUT_MS = 20_000

const DEFAULT_TIMEOUT_REPLY = "I'm taking a bit longer than usual. Please try again in a moment."

/**
 * Returns a safe origin (scheme + host + port) for use in LLM prompts, or null if invalid.
 * Prevents prompt injection by never including path, query, or fragment from user input.
 */
function getSafeOriginForPrompt(url: string): string | null {
  const trimmed = typeof url === 'string' ? url.trim() : ''
  if (!trimmed || trimmed.length > 2048) return null
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed.origin
  } catch {
    return null
  }
}

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

const PROFILE_KEYS = ['adhd', 'seizure-epileptic', 'cognitive-learning', 'visually-impaired', 'dyslexia-font', 'color-blind', 'blind', 'motor-impaired'] as const

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

const WIDGET_POSITIONS = ['bottom-left', 'bottom-right', 'top-left', 'top-right', 'center-left', 'center-right', 'bottom-center', 'top-center'] as const

const PAGE_COLOR_SECTIONS = ['text', 'title', 'background'] as const
const PAGE_COLOR_VALUES = ['white', 'black', 'orange', 'blue', 'red', 'green', 'default'] as const

type PageLink = {
  href: string
  text?: string
  ariaLabel?: string
}

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

type WidgetCommandType = 'open_menu' | 'close_menu' | 'navigate' | 'profile' | 'tool' | 'language' | 'font_size' | 'widget_position' | 'oversize_widget' | 'menu_theme' | 'reset' | 'widget_visibility' | 'page_color' | 'none'

type WidgetCommand =
  | { type: 'open_menu' }
  | { type: 'close_menu' }
  /**
   * Navigate the user to a specific link.
   * Use "href" for full/relative URLs (including hash links for in-page navigation).
   * "behavior" is optional; omit or use "smooth" unless "instant" is explicitly needed.
   */
  | { type: 'navigate'; href: string; behavior?: 'smooth' | 'instant' }
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
  /** Current page URL (widget always sends this as window.location.href). Used for context and page summary lookup. */
  currentUrl?: string
  /** @deprecated Use currentUrl. Optional site URL where the widget is embedded (fallback if currentUrl not sent). */
  siteUrl?: string
  /** Optional language hint (e.g. 'en', 'es') so the model can respond in that language. */
  language?: string
  /**
   * Optional list of links on the current page that the widget sends for navigation help.
   * Frontend contract: prefers "links"; "pageLinks" is kept for backward compatibility.
   */
  pageLinks?: PageLink[]
  links?: PageLink[]
}

export interface WidgetSimplifyRequestBody {
  /** Full URL of the page where the text comes from (optional, for light context only). */
  currentUrl?: string
  /** Raw text that should be simplified for the user. */
  text: string
}

export interface WidgetSimplifyResponseBody {
  /** Simplified, user-friendly version of the input text. */
  simplifiedText: string
}

/** Ensure replies are plain human-readable text (not JSON-looking). */
function cleanReply(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return undefined
  }
  return trimmed
}

/** Heuristic: detect when the user is asking for navigation or page links. */
function isNavigationIntent(message: string): boolean {
  const lower = message.trim().toLowerCase()
  if (!lower) return false

  const keywords = ['navigate', 'navigation', 'link', 'links', 'page', 'pages', 'open', 'go to', 'go back to', 'take me to', 'show me page links', 'what pages are available', 'what links are available', 'external links', 'help me navigate']

  return keywords.some((kw) => lower.includes(kw))
}

/** Detect if the user is asking for a page summary (so we can fetch from DB and append it). */
function isSummaryRequest(message: string): boolean {
  const lower = message.trim().toLowerCase()
  const summaryPhrases = [
    'summary',
    'summarize',
    'summarise',
    'summarize this page',
    'summarise this page',
    'page summary',
    'what is this page about',
    "what's this page about",
    'what is the page about',
    'describe this page',
    'tell me about this page',
    'what is on this page',
    "what's on this page",
    'overview of this page',
    'brief this page',
  ]
  return summaryPhrases.some((p) => lower.includes(p))
}

function parseAndValidateActions(raw: string): WidgetChatAction[] {
  const trimmed = raw.trim()
  if (!trimmed) {
    throw new Error('Empty AI response')
  }

  let parsed: unknown
  try {
    let candidate = trimmed

    // Strip any leading/trailing noise so we keep only the outermost JSON region.
    const firstBrace = candidate.indexOf('{')
    const lastBrace = candidate.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      candidate = candidate.slice(firstBrace, lastBrace + 1)
    }

    // Try parsing as-is first.
    try {
      parsed = JSON.parse(candidate)
    } catch {
      // If the model returned multiple objects back-to-back, join them into a JSON array.
      try {
        const multi = candidate.replace(/}\s*{/g, '},{')
        const arrayCandidate = candidate.trim().startsWith('[') ? multi : `[${multi}]`
        parsed = JSON.parse(arrayCandidate)
      } catch {
        // Fallback: extract all JSON object-like segments and parse them individually,
        // ignoring any trailing stray braces or noise.
        const objectMatches = candidate.match(/{[\s\S]*?}/g)
        if (!objectMatches || objectMatches.length === 0) {
          throw new Error('AI response is not valid JSON')
        }
        const parsedObjects: unknown[] = []
        for (const part of objectMatches) {
          try {
            const obj = JSON.parse(part)
            if (obj && typeof obj === 'object') {
              parsedObjects.push(obj)
            }
          } catch {
            // ignore invalid chunks
          }
        }
        if (parsedObjects.length === 0) {
          throw new Error('AI response is not valid JSON')
        }
        parsed = parsedObjects
      }
    }
  } catch {
    throw new Error('AI response is not valid JSON')
  }

  const items = Array.isArray(parsed) ? parsed : [parsed]

  const actions: WidgetChatAction[] = items.map((item, index) => {
    if (typeof item !== 'object' || item === null) {
      throw new Error(`AI response item at index ${index} is not an object`)
    }

    let obj = item as { command?: any; reply?: unknown; type?: unknown }
    let { command, reply } = obj

    // Tolerate shorthand shape: { type: "none", reply: "..." } by wrapping into { command, reply }
    if ((!command || typeof command !== 'object') && typeof obj.type === 'string') {
      const { reply: itemReply, ...rest } = obj as any
      command = rest
      reply = itemReply
      obj = { command, reply }
    }

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
      case 'navigate': {
        const href = typeof command.href === 'string' ? command.href.trim() : ''
        if (!href) {
          throw new Error(`navigate command at index ${index} must include non-empty "href"`)
        }
        const lowerHref = href.toLowerCase()
        const isUnsafeScheme = lowerHref.startsWith('javascript:') || lowerHref.startsWith('data:') || lowerHref.startsWith('vbscript:')
        if (isUnsafeScheme) {
          throw new Error(`navigate command at index ${index} has disallowed URI scheme in "href"`)
        }
        if (command.behavior !== undefined && command.behavior !== 'smooth' && command.behavior !== 'instant') {
          throw new Error(`navigate command behavior at index ${index} must be "smooth" or "instant" when provided`)
        }
        break
      }

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
              throw new Error(`Invalid mode "${command.mode}" for tool "${command.value}" at index ${index}. Allowed: ${allowedModes.join(', ')}`)
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

    const safeReply = cleanReply(reply)
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
    const { message, messages: history = [], currentUrl, siteUrl, language, pageLinks, links } = body
    const pageUrl = typeof currentUrl === 'string' && currentUrl.trim() ? currentUrl.trim() : typeof siteUrl === 'string' && siteUrl.trim() ? siteUrl.trim() : undefined

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
    if (pageUrl) {
      systemPrompt += `\n\nCURRENT SITE: The visitor is on this website: ${pageUrl}. You can refer to "this site" when giving directions.`
    }

    const rawLinks: PageLink[] = (Array.isArray(pageLinks) && pageLinks.length ? pageLinks : Array.isArray(links) && links.length ? links : []).filter((link): link is PageLink => !!link && typeof link.href === 'string' && !!link.href.trim())

    const shouldIncludeLinksInPrompt = isNavigationIntent(trimmedMessage)
    const linksForPrompt = shouldIncludeLinksInPrompt ? rawLinks.slice(0, 50) : []

    if (linksForPrompt.length > 0) {
      systemPrompt += `\n\nPAGE LINKS:\n`
      systemPrompt += linksForPrompt
        .map((link, index) => {
          const label = typeof link.text === 'string' && link.text.trim().length ? link.text.trim() : typeof link.ariaLabel === 'string' && link.ariaLabel.trim().length ? link.ariaLabel.trim() : link.href.trim()
          return `${index + 1}. ${label} -> ${link.href.trim()}`
        })
        .join('\n')
      systemPrompt +=
        `\n\nThe numbered PAGE LINKS above are real links on the current page. ` +
        `You can help the user choose between them in your "reply", and when they clearly ask to open one of these links, ` +
        `return a navigate command with the matching href, for example: { "command": { "type": "navigate", "href": "<one of the URLs above>" }, "reply": "Opening that page for you." }.`
    }

    if (language) {
      systemPrompt += `\n\nPREFERRED LANGUAGE: Prefer responding in language code "${language}" if the user writes in that language.`
    }

    // Summary request from widget: fetch existing summary, or if HTML exists in DB generate and store one; if no HTML in DB return default.
    const isSummary = Boolean(pageUrl && isSummaryRequest(trimmedMessage))
    let summaryToAppend: string | null = null
    let summaryPromise: Promise<string | null> | null = null

    if (isSummary && pageUrl) {
      summaryPromise = (async (): Promise<string | null> => {
        const existing = await getPageSummaryByUrl({ url: pageUrl!, urlHash: null })
        if (existing != null && existing.trim()) return existing.trim()
        const html = await getPageHtmlByUrl({ url: pageUrl!, urlHash: null })
        if (html == null) return null // no HTML in DB → caller will use default message
        const textContent = extractTextFromHtml(html)
        const summary = await generatePageSummary(textContent, pageUrl!)
        await updatePageSummary({ url: pageUrl!, urlHash: null, summary })
        return summary
      })()
      systemPrompt += `\n\nIMPORTANT: The user asked for a page summary. The summary will be added to the response automatically — do NOT say you cannot summarize, cannot help with the summary, or mention the summary at all. Reply only with the appropriate widget command(s) the user requested (if any) and short confirmations of those actions (e.g. "Opening the menu." or "Done."). If the user only asked for a summary and no widget action, respond with { "command": { "type": "none" }, "reply": "Okay." } or a similar short acknowledgement.`
    }

    const chatMessages = [
      ...history.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      })),
      { role: 'user' as const, content: trimmedMessage },
    ].filter((m) => m.role !== 'system') as Array<{ role: 'user' | 'assistant'; content: string }>

    const messagesForModel = [{ role: 'system' as const, content: systemPrompt }, ...chatMessages.map((m) => ({ role: m.role, content: m.content }))]

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

      rawReply = completion.choices?.[0]?.message?.content && typeof completion.choices[0].message.content === 'string' ? completion.choices[0].message.content : ''
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

        rawReply = fallbackCompletion.choices?.[0]?.message?.content && typeof fallbackCompletion.choices[0].message.content === 'string' ? fallbackCompletion.choices[0].message.content : ''
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

    // If a summary was requested: we have either an existing summary, a newly generated one (stored in DB), or no HTML in DB → default message.
    if (summaryPromise) {
      try {
        const pageSummary = await summaryPromise
        const summaryReplyText = pageSummary != null && pageSummary.trim() ? `Here's a quick summary of this page:\n\n${pageSummary.trim()}` : "The page summary isn't available for this page right now."
        summaryToAppend = summaryReplyText
      } catch (summaryError) {
        console.error('Widget chat: page summary generation failed (continuing without summary).', {
          error: (summaryError as Error)?.message,
        })
      }
    }

    let actions: WidgetChatAction[]
    try {
      actions = parseAndValidateActions(rawReply)
    } catch (parseError) {
      console.error('Widget chat: failed to parse AI response, falling back to safe reply.', {
        error: (parseError as Error)?.message,
        rawReply,
      })

      const cleaned = cleanReply(rawReply)
      const safeText = cleaned ?? DEFAULT_TIMEOUT_REPLY

      actions = [{ command: { type: 'none' }, reply: safeText }]
    }
    // Derive a user-facing reply from the first non-empty action reply, not from the raw JSON string
    const firstActionWithReply = actions.find((a) => typeof a.reply === 'string' && a.reply.trim().length > 0)
    let replyToSend = cleanReply(firstActionWithReply?.reply) ?? ''

    if (summaryToAppend) {
      // When we have a summary, the main reply is the summary only (no generic model line)
      actions = [...actions, { command: { type: 'none' as const }, reply: summaryToAppend }]
      replyToSend = summaryToAppend
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.status(200).json({ reply: replyToSend, actions })
  } catch (error) {
    console.error('Widget chat API error:', error)
    res.status(500).json({
      error: 'An error occurred while processing your message.',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
    })
  }
}

/**
 * POST /widget/simplify
 * Simple, open-ended text simplification endpoint for the embeddable widget.
 * Body: { currentUrl?: string; text: string }
 * Response: { simplifiedText: string }
 */
export async function handleWidgetSimplifyRequest(req: Request, res: Response) {
  try {
    const body = req.body as WidgetSimplifyRequestBody
    const { currentUrl, text } = body

    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Missing or invalid "text" in request body.' })
      return
    }

    const trimmedText = text.trim()
    if (!trimmedText) {
      res.status(400).json({ error: 'Text cannot be empty.' })
      return
    }

    const words = trimmedText.split(/\s+/).filter(Boolean)
    if (words.length > 200) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.status(200).json({
        simplifiedText: 'The selected text is too long. Please select a smaller section (up to 200 words) to simplify.',
      } satisfies WidgetSimplifyResponseBody)
      return
    }

    let systemPrompt =
      'You are an accessibility assistant that simplifies website text for easier reading. ' + 'Given some text from a web page, rewrite it in clearer, shorter, plain language while keeping the original meaning. ' + 'Do not explain your changes, just return the simplified text only.'

    const safeOrigin = getSafeOriginForPrompt(currentUrl ?? '')
    if (safeOrigin) {
      systemPrompt += ` The text comes from this page: ${safeOrigin}.`
    }

    const messagesForModel = [
      { role: 'system' as const, content: systemPrompt },
      {
        role: 'user' as const,
        content: `Simplify this text for accessibility and easier reading:\n\n"${trimmedText}"`,
      },
    ]

    let simplified = ''

    try {
      const completion = await withTimeout(
        openrouter.chat.completions.create({
          model: 'google/gemini-2.5-flash-lite',
          messages: messagesForModel,
        }),
        WIDGET_CHAT_TIMEOUT_MS,
      )

      simplified = completion.choices?.[0]?.message?.content && typeof completion.choices[0].message.content === 'string' ? completion.choices[0].message.content : ''
    } catch (primaryError) {
      if ((primaryError as Error)?.message === 'WIDGET_CHAT_TIMEOUT') {
        console.warn('Widget simplify: primary model request timed out')
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.status(200).json({
          simplifiedText: trimmedText,
        } satisfies WidgetSimplifyResponseBody)
        return
      }

      console.warn('Primary model failed, falling back to openai/gpt-4o-mini for widget simplify')

      try {
        const fallbackCompletion = await withTimeout(
          openrouter.chat.completions.create({
            model: 'openai/gpt-4o-mini',
            messages: messagesForModel,
          }),
          WIDGET_CHAT_TIMEOUT_MS,
        )

        simplified = fallbackCompletion.choices?.[0]?.message?.content && typeof fallbackCompletion.choices[0].message.content === 'string' ? fallbackCompletion.choices[0].message.content : ''
      } catch (fallbackError) {
        if ((fallbackError as Error)?.message === 'WIDGET_CHAT_TIMEOUT') {
          console.warn('Widget simplify: fallback model request timed out')
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.status(200).json({
            simplifiedText: trimmedText,
          } satisfies WidgetSimplifyResponseBody)
          return
        }
        throw fallbackError
      }
    }

    const cleaned = typeof simplified === 'string' ? simplified.trim() : ''
    const simplifiedText = cleaned || trimmedText

    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.status(200).json({ simplifiedText } satisfies WidgetSimplifyResponseBody)
  } catch (error) {
    console.error('Widget simplify API error:', error)
    res.status(500).json({
      error: 'An error occurred while simplifying your text.',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
    })
  }
}
