import OpenAI from 'openai'

if (!process.env.OPENROUTER_API_KEY) {
  throw new Error('OPENROUTER_API_KEY environment variable is required')
}

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': 'Webability.io',
    'X-Title': 'Webability.io - Suggested Accessibility Fixes',
  },
})

export interface AutoFixItem {
  selector?: string
  issue_type?: string
  wcag_criteria?: string
  wcag?: string
  action?: 'update' | 'add'
  attributes?: Record<string, unknown>
  impact?: string
  description?: string
  current_value?: string
  confidence?: number
  suggested_fix?: string
  category?: string
}

const SUGGESTED_FIXES_FUNCTION_SCHEMA = {
  type: 'function' as const,
  function: {
    name: 'suggest_accessibility_fixes',
    description: 'Return additional accessibility fixes. Each fix must match the exact format: selector, issue_type, wcag_criteria, action, attributes, impact, description, current_value, confidence, wcag, suggested_fix, category. Do not repeat existing fixes.',
    parameters: {
      type: 'object',
      properties: {
        suggested_fixes: {
          type: 'array',
          description: 'Array of fix objects. Each has exactly: selector, issue_type, wcag_criteria, action, attributes, impact, description, current_value, confidence, wcag, suggested_fix, category.',
          items: {
            type: 'object',
            properties: {
              selector: { type: 'string' },
              issue_type: { type: 'string' },
              wcag_criteria: { type: 'string' },
              action: { type: 'string', enum: ['update', 'add'] },
              attributes: { type: 'object', additionalProperties: true, description: 'MUST NOT be empty. Use {"alt":"..."}, {"role":null}, {"aria-expanded":"true"}, etc.' },
              impact: { type: 'string', enum: ['minor', 'moderate', 'serious', 'critical'] },
              description: { type: 'string' },
              current_value: { type: ['string', 'null'], description: 'Current attribute/value; null if not applicable' },
              confidence: { type: 'number' },
              wcag: { type: 'string' },
              suggested_fix: { type: 'string' },
              category: { type: 'string', enum: ['animations', 'buttons', 'aria', 'duplicate_ids', 'focus', 'headings', 'tables', 'forms', 'links', 'icons', 'images', 'keyboard', 'media'] },
            },
            required: ['selector', 'issue_type', 'wcag_criteria', 'action', 'attributes', 'impact', 'description', 'current_value', 'confidence', 'wcag', 'suggested_fix', 'category'],
          },
        },
      },
      required: ['suggested_fixes'],
    },
  },
}

export interface GetSuggestedFixesInput {
  url: string
  html: string
  existingFixes: AutoFixItem[]
}

/**
 * Call GPT to suggest additional accessibility fixes for the given HTML.
 * Excludes fixes that duplicate any already in existingFixes.
 * Returns fix objects in the same format as result_json.analysis.fixes.
 */
export async function getSuggestedFixes(input: GetSuggestedFixesInput): Promise<AutoFixItem[]> {
  const { url, html, existingFixes } = input

  // Input validation
  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    throw new Error('url is required and must be a non-empty string')
  }
  if (!html || typeof html !== 'string' || html.trim().length === 0) {
    throw new Error('html is required and must be a non-empty string')
  }
  if (!Array.isArray(existingFixes)) {
    throw new Error('existingFixes must be an array')
  }

  const existingJson = JSON.stringify(existingFixes, null, 2)
  const htmlSnippet = html.length > 80_000 ? html.slice(0, 80_000) + '\n\n...[truncated]' : html

  const exactFormatExample = `{
  "selector": "nav.transition-all.bg-transparent.duration-300.w-full",
  "issue_type": "redundant_aria_role",
  "wcag_criteria": "4.1.2",
  "action": "update",
  "attributes": { "role": null },
  "impact": "minor",
  "description": "Redundant role='navigation' on <nav> (implicit role)",
  "current_value": "navigation",
  "confidence": 0.95,
  "wcag": "4.1.2",
  "suggested_fix": "Remove redundant role='navigation' from <nav>",
  "category": "aria"
}`

  const systemPrompt = `You are an accessibility expert. You will receive:
1. A page URL
2. The raw HTML of that page
3. The existing auto-fixes JSON for that page (array of fix objects)

Your task: Find ADDITIONAL accessibility issues and suggest fixes. Return them in the EXACT same JSON format as below.

REQUIRED FORMAT — each fix object MUST have exactly these fields in this order:
selector, issue_type, wcag_criteria, action, attributes, impact, description, current_value, confidence, wcag, suggested_fix, category

Examples (follow this structure exactly):
${exactFormatExample}

Rules:
- Return at most 20 suggested fixes to avoid truncation.
- Do NOT repeat any fix already present in the existing JSON. Match by selector+issue_type or by equivalent meaning.
- action: "update" (attribute change/removal) or "add" (new element, e.g. skip link).
- attributes: MUST NOT be empty {}. Always include the concrete attribute change:
  - Remove attribute: { "role": null }, { "aria-hidden": null }, etc.
  - Add/change attribute: { "alt": "descriptive text" }, { "aria-label": "..." }, { "autocomplete": "email" }, { "aria-expanded": "true" }, { "aria-haspopup": "menu" }, etc.
  - Body prepend (skip link): { "prepend": "<a href=\\"#main-content\\" class=\\"skip-link\\">Skip to main content</a>" }.
  - For alt fixes: use { "alt": "specific description" } with the exact suggested alt text. For decorative images use { "alt": "" }.
  - For aria-expanded / aria-haspopup: use { "aria-expanded": "true" } or { "aria-haspopup": "menu" } etc. as appropriate.
- impact: "minor" | "moderate" | "serious" | "critical"
- current_value: the current attribute/value when relevant; use null if not applicable.
- confidence: number 0–1 (e.g. 0.95).
- wcag and wcag_criteria: same value (e.g. "4.1.2").
- category: REQUIRED. Exactly one of: "animations" | "buttons" | "aria" | "duplicate_ids" | "focus" | "headings" | "tables" | "forms" | "links" | "icons" | "images" | "keyboard" | "media".`

  const userPrompt = `URL: ${url}

Existing fixes (do not duplicate these):
${existingJson}

Page HTML:
\`\`\`html
${htmlSnippet}
\`\`\`

Return ONLY new suggested fixes (at most 10). Each fix MUST use the exact same JSON structure as the examples. attributes must never be empty {}—always include the concrete attribute change (e.g. {"alt":"..."}, {"role":null}).`

  // Model configuration - can be moved to env var if needed
  const model = 'google/gemini-2.5-flash'

  let fixes = await tryWithTools(model, systemPrompt, userPrompt)
  if (fixes.length === 0) {
    fixes = await tryWithoutTools(model, systemPrompt, userPrompt)
  }
  if (fixes.length === 0) {
    throw new Error('No structured response from GPT for suggested fixes')
  }
  const normalized = fixes.map(normalizeFix)
  // Filter out fixes that still have empty attributes after inference
  const withAttributes = normalized.filter((f) => {
    const attrs = f.attributes
    return attrs && typeof attrs === 'object' && !Array.isArray(attrs) && Object.keys(attrs).length > 0
  })
  if (withAttributes.length < normalized.length) {
    console.warn(`[SuggestedFixes] Filtered out ${normalized.length - withAttributes.length} fixes with empty attributes`)
  }
  return withAttributes
}

const VALID_CATEGORIES = [
  'animations',
  'buttons',
  'aria',
  'duplicate_ids',
  'focus',
  'headings',
  'tables',
  'forms',
  'links',
  'icons',
  'images',
  'keyboard',
  'media',
] as const

// FixCategory type is kept for internal use and potential future exports
type FixCategory = (typeof VALID_CATEGORIES)[number]

function isValidCategory(c: string): c is FixCategory {
  return (VALID_CATEGORIES as readonly string[]).includes(c)
}

const EXACT_FORMAT_KEYS = [
  'selector',
  'issue_type',
  'wcag_criteria',
  'action',
  'attributes',
  'impact',
  'description',
  'current_value',
  'confidence',
  'wcag',
  'suggested_fix',
  'category',
] as const

function inferCategory(issueType: string | undefined): FixCategory {
  if (!issueType || typeof issueType !== 'string') return 'aria'
  const t = issueType.toLowerCase()
  if (/icon|decorative_icon|lucide/.test(t)) return 'icons'
  if (/image|alt|img|picture|cover|portrait/.test(t)) return 'images'
  if (/aria|redundant|missing_aria|sr_only|haspopup|label|expanded/.test(t)) return 'aria'
  if (/form|input|identify_input|autocomplete/.test(t)) return 'forms'
  if (/focus/.test(t)) return 'focus'
  if (/keyboard|bypass|skip/.test(t)) return 'keyboard'
  if (/link|anchor/.test(t)) return 'links'
  if (/button|btn/.test(t)) return 'buttons'
  if (/heading|h1|h2|h3/.test(t)) return 'headings'
  if (/table|thead|tbody/.test(t)) return 'tables'
  if (/duplicate|id/.test(t)) return 'duplicate_ids'
  if (/animation|motion/.test(t)) return 'animations'
  if (/media|video|audio/.test(t)) return 'media'
  return 'aria'
}

function isEmptyAttributes(v: unknown): boolean {
  if (v == null) return true
  if (typeof v !== 'object' || Array.isArray(v)) return true
  return Object.keys(v as Record<string, unknown>).length === 0
}

/**
 * Infer attributes when GPT returns empty {}.
 * Uses issue_type, suggested_fix, description, current_value, selector.
 */
function inferAttributes(f: AutoFixItem): Record<string, unknown> {
  const t = (f.issue_type ?? '').toLowerCase()
  const fix = (f.suggested_fix ?? '').toLowerCase()
  const desc = (f.description ?? '').toLowerCase()
  const cur = f.current_value ?? ''
  const selector = (f.selector ?? '').toLowerCase()

  if (/redundant_aria_role|redundant.*role/.test(t)) return { role: null }
  if (/aria_expanded|expanded_missing/.test(t)) return { 'aria-expanded': 'true' }
  if (/missing_aria_haspopup|haspopup/.test(t)) {
    if (/menu|nav|dropdown/.test(fix) || /menu|nav|dropdown/.test(desc)) return { 'aria-haspopup': 'menu' }
    if (/dialog|modal|popup/.test(fix) || /dialog|modal/.test(desc)) return { 'aria-haspopup': 'dialog' }
    return { 'aria-haspopup': 'menu' }
  }
  if (/missing_aria_controls|aria.?controls/.test(t)) {
    const controlsId = extractAriaControlsFromSuggestedFix(f.suggested_fix) ?? extractIdFromSelector(selector)
    return { 'aria-controls': controlsId || 'submenu-id' }
  }
  if (/bypass_blocks|skip.*link|skip to main/.test(t) || /skip to main|skip link/.test(fix)) {
    return { prepend: '<a href="#main-content" class="skip-link">Skip to main content</a>' }
  }
  if (/identify_input_purpose|autocomplete|input.*purpose/.test(t)) {
    if (/email|e-mail/.test(fix) || /email|e-mail/.test(desc)) return { autocomplete: 'email' }
    if (/name|full.?name/.test(fix) || /name/.test(desc)) return { autocomplete: 'name' }
    return { autocomplete: 'email' }
  }
  if (/redundant_text|redundant_sr|redundant_screen|sr_only|screen_reader/.test(t)) {
    if (/remove|delete/.test(fix)) return { 'aria-hidden': 'true' }
    return { 'aria-hidden': 'true' }
  }
  if (/decorative_icon|decorative.*icon|icon.*decorative/.test(t)) return { 'aria-hidden': 'true', role: 'presentation' }
  if (/non_descriptive_alt|missing_alt|image_alt|alt_text|decorative_image|image_in_link/.test(t)) {
    const alt = extractAltFromSuggestedFix(f.suggested_fix) ?? (cur || '')
    return { alt: alt || '' }
  }
  if (/missing_aria_label|aria.?label/.test(t)) {
    const label = extractAriaLabelFromSuggestedFix(f.suggested_fix) ?? 'Accessible name'
    return { 'aria-label': label }
  }
  return {}
}

function extractAltFromSuggestedFix(s: string | undefined): string | null {
  if (!s || typeof s !== 'string') return null
  // Try multiple patterns: "e.g., 'Portrait of...'", "alt to '...'", "use '...'", "change to '...'", "alt='...'"
  const patterns = [
    /e\.g\.\s*,\s*["']([^"']+)["']/i,
    /alt\s*(?:to|[:=])\s*["']?([^"']+)["']?/i,
    /use\s+["']([^"']+)["']/i,
    /change\s+to\s+["']([^"']+)["']/i,
    /update\s+alt\s+text\s+to\s+["']([^"']+)["']/i,
    /describe.*as\s+["']([^"']+)["']/i,
    /["']([^"']+)["']/,
  ]
  for (const pattern of patterns) {
    const m = s.match(pattern)
    if (m && m[1] && m[1].length > 3) return m[1].trim()
  }
  return null
}

function extractAriaLabelFromSuggestedFix(s: string | undefined): string | null {
  if (!s || typeof s !== 'string') return null
  const m = s.match(/aria-label\s*=\s*["']([^"']+)["']/i) ?? s.match(/["']([^"']+)["']/)
  return m ? m[1].trim() : null
}

function extractAriaControlsFromSuggestedFix(s: string | undefined): string | null {
  if (!s || typeof s !== 'string') return null
  // Look for "ID of the controlled submenu", "referencing the ID", "aria-controls='...'", etc.
  const m = s.match(/aria-controls\s*=\s*["']([^"']+)["']/i) ?? s.match(/id\s+of\s+the\s+controlled\s+(\w+)/i) ?? s.match(/id[:\s]+([a-z0-9_-]+)/i)
  return m ? m[1].trim() : null
}

function extractIdFromSelector(selector: string): string | null {
  if (!selector || typeof selector !== 'string') return null
  // Try to extract ID from selector like "#submenu-id", "[id='submenu-id']", etc.
  const m = selector.match(/#([a-z0-9_-]+)/i) ?? selector.match(/\[id\s*=\s*["']([^"']+)["']\]/i)
  return m ? m[1].trim() : null
}

function normalizeFix(f: AutoFixItem): AutoFixItem {
  const raw = f.category?.trim() || inferCategory(f.issue_type)
  const category = isValidCategory(raw) ? raw : inferCategory(f.issue_type)
  const rawAction = (f as { action?: string }).action
  const action = rawAction === 'add' ? 'add' : rawAction === 'remove' ? 'update' : (f.action ?? 'update')
  const wcag = f.wcag ?? f.wcag_criteria ?? ''
  const wcag_criteria = f.wcag_criteria ?? wcag
  let attrs = f.attributes ?? {}
  if (isEmptyAttributes(attrs)) {
    const inferred = inferAttributes(f)
    attrs = Object.keys(inferred).length > 0 ? inferred : attrs
  }
  const out: Record<string, unknown> = {
    ...f,
    category,
    action,
    wcag_criteria,
    wcag,
    attributes: attrs,
    current_value: f.current_value ?? null,
    confidence: typeof f.confidence === 'number' ? f.confidence : 0.9,
  }
  return toExactFormat(out as AutoFixItem)
}

function toExactFormat(f: AutoFixItem): AutoFixItem {
  const obj: Record<string, unknown> = {}
  const src = f as Record<string, unknown>
  for (const k of EXACT_FORMAT_KEYS) {
    let v = src[k]
    if (v === undefined) {
      if (k === 'current_value') v = null
      else if (k === 'confidence') v = 0.9
      else if (k === 'attributes') v = {}
      else v = ''
    }
    obj[k] = v
  }
  return obj as AutoFixItem
}

function getMessageContent(msg: { content?: unknown } | null): string {
  if (!msg?.content) return ''
  const c = msg.content
  if (typeof c === 'string') return c.trim()
  if (Array.isArray(c)) {
    return c
      .map((p) => (p && typeof p === 'object' && 'text' in p && typeof (p as { text?: unknown }).text === 'string' ? (p as { text: string }).text : ''))
      .filter(Boolean)
      .join('\n')
      .trim()
  }
  return ''
}

async function tryWithTools(model: string, systemPrompt: string, userPrompt: string): Promise<AutoFixItem[]> {
  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      tools: [SUGGESTED_FIXES_FUNCTION_SCHEMA],
      tool_choice: { type: 'function', function: { name: 'suggest_accessibility_fixes' } },
      temperature: 0.2,
      max_tokens: 16384,
    })

    const msg = completion.choices[0]?.message
    const toolCall = msg?.tool_calls?.[0]

    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments) as { suggested_fixes?: AutoFixItem[] }
        return Array.isArray(parsed.suggested_fixes) ? parsed.suggested_fixes : []
      } catch (e) {
        console.error('[SuggestedFixes] Failed to parse tool call arguments:', {
          error: e instanceof Error ? e.message : String(e),
          argumentsPreview: toolCall.function.arguments?.slice(0, 200),
        })
        return []
      }
    }

    const content = getMessageContent(msg ?? null)
    if (content) return parseFixesFromContent(content)

    console.warn('[SuggestedFixes] Tools request: no tool call, no content', {
      finishReason: completion.choices[0]?.finish_reason,
      contentType: Array.isArray(msg?.content) ? 'array' : typeof msg?.content,
      contentLen: Array.isArray(msg?.content) ? (msg.content as unknown[]).length : (typeof msg?.content === 'string' ? msg?.content.length : 0),
    })
    return []
  } catch (e) {
    console.error('[SuggestedFixes] Error in tryWithTools:', {
      error: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined,
    })
    return []
  }
}

async function tryWithoutTools(model: string, systemPrompt: string, userPrompt: string): Promise<AutoFixItem[]> {
  const jsonOnlySystem = `${systemPrompt}

CRITICAL: Respond with ONLY a valid JSON object. No markdown, no code fences, no explanation.
Use this exact shape: {"suggested_fixes": [ ... ]}. Every item MUST have exactly these fields. attributes MUST NOT be empty {}—always include the concrete change (e.g. {"alt":"..."}, {"role":null}). category MUST be one of: animations, buttons, aria, duplicate_ids, focus, headings, tables, forms, links, icons, images, keyboard, media. Use null for current_value when not applicable. Same structure as the example in the system prompt.`

  const userMsg = `${userPrompt}\n\nOutput ONLY the JSON object {"suggested_fixes": [...]}.`

  const baseParams = {
    model,
    messages: [
      { role: 'system' as const, content: jsonOnlySystem },
      { role: 'user' as const, content: userMsg },
    ],
    temperature: 0.2,
    max_tokens: 16384,
  }

  let completion: Awaited<ReturnType<typeof openai.chat.completions.create>>
  try {
    completion = await openai.chat.completions.create({
      ...baseParams,
      response_format: { type: 'json_object' as const },
    })
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e)
    if (/response_format|json_object|not supported/i.test(err)) {
      completion = await openai.chat.completions.create(baseParams)
    } else {
      throw e
    }
  }

  const content = getMessageContent(completion.choices[0]?.message ?? null)
  if (!content) {
    console.warn('[SuggestedFixes] JSON-only request: empty content', {
      finishReason: completion.choices[0]?.finish_reason,
    })
    return []
  }
  const fixes = parseFixesFromContent(content)
  if (fixes.length === 0) {
    console.warn('[SuggestedFixes] JSON-only request: unparseable content', { contentPreview: content.slice(0, 400) })
  }
  return fixes
}

function parseFixesFromContent(content: string): AutoFixItem[] {
  let raw = content
  const jsonBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonBlock) raw = jsonBlock[1].trim()
  let data: unknown = null
  try {
    data = JSON.parse(raw) as unknown
  } catch {
    const repaired = repairTruncatedJson(raw)
    if (repaired) {
      try {
        data = JSON.parse(repaired) as unknown
      } catch {
        return []
      }
    } else {
      return []
    }
  }
  if (Array.isArray(data)) return data as AutoFixItem[]
  if (data && typeof data === 'object' && 'suggested_fixes' in data) {
    const arr = (data as { suggested_fixes?: unknown }).suggested_fixes
    return Array.isArray(arr) ? (arr as AutoFixItem[]) : []
  }
  return []
}

/**
 * If the model output was truncated (max_tokens), try to close the JSON and parse.
 * Trims trailing incomplete key like ", \"d" or ", \"desc\" then appends ]}.
 */
function repairTruncatedJson(raw: string): string | null {
  if (!raw.includes('"suggested_fixes"') || !raw.includes('[')) return null
  let s = raw.trim()
  const trailingIncomplete = s.match(/,\s*"[^"]*"?\s*$/)
  if (trailingIncomplete) s = s.slice(0, -trailingIncomplete[0].length)
  s = s.trimEnd()
  if (s.endsWith(',')) s = s.slice(0, -1)
  if (s.endsWith('}]}')) return s
  if (s.endsWith(']}')) return s
  if (s.endsWith('}')) return s + ']}'
  return s + '}]}'
}
