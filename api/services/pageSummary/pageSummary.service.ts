import OpenAI from 'openai'

if (!process.env.OPENROUTER_API_KEY) {
  throw new Error('OPENROUTER_API_KEY environment variable is required')
}

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': 'Webability.io',
    'X-Title': 'Webability.io - Page Summary',
  },
})

const MAX_CONTENT_LENGTH = 10_000

/**
 * Extracts text from HTML keeping only <p> and <h1>-<h6> tags.
 * Strips script/style, then collects content of p and h* tags, strips inner tags, collapses whitespace.
 */
export function extractTextFromHtml(html: string): string {
  let s = html

  // Remove script, style, noscript
  s = s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
  s = s.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
  s = s.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, '')

  const parts: string[] = []
  const tagRegex = /<(p|h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/gi
  let match: RegExpExecArray | null
  while ((match = tagRegex.exec(s)) !== null) {
    const inner = match[2]
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (inner.length > 0) parts.push(inner)
  }

  const text = parts.join('\n\n').trim()
  if (text.length > MAX_CONTENT_LENGTH) {
    return text.slice(0, MAX_CONTENT_LENGTH) + '\n...[truncated]'
  }
  return text
}

/**
 * Generates a short plain-language summary of the page content using AI.
 */
export async function generatePageSummary(pageContent: string, url: string): Promise<string> {
  if (!pageContent || !pageContent.trim()) {
    return 'No text content could be extracted from this page.'
  }

  const systemPrompt = `You are a helpful assistant that summarizes web page content in 2-4 short paragraphs. Output only the summary, no headings or labels. Keep it concise and informative for someone who wants to know what the page is about.`

  const userPrompt = `Summarize the following page content (from ${url}) in 2-4 short paragraphs. Output only the summary.\n\nPage content:\n${pageContent}`

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { role: 'user' as const, content: userPrompt },
  ]
  const options = {
    messages,
    temperature: 0.3,
    max_tokens: 600,
  }

  const primaryModel = 'google/gemini-2.5-flash-lite'
  const fallbackModel = 'openai/gpt-4o-mini'

  try {
    const completion = await openai.chat.completions.create({
      model: primaryModel,
      ...options,
    })
    const content = completion.choices[0]?.message?.content?.trim()
    if (content) return content
  } catch {
    // Fall back to GPT-4o-mini
  }

  const completion = await openai.chat.completions.create({
    model: fallbackModel,
    ...options,
  })
  const content = completion.choices[0]?.message?.content?.trim()
  if (content) return content
  throw new Error('AI returned no summary content')
}
