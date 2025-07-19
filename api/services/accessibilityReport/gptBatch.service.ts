import dotenv from 'dotenv'
import OpenAI from 'openai'

dotenv.config()

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': 'Webability.io',
    'X-Title': 'Webability.io - Accessibility Compliance Solution',
  },
})

interface ProcessedIssue {
  code: string
  message: string
  context: string[]
  selectors: string[]
  type: 'error' | 'warning' | 'notice'
  runner: 'axe' | 'htmlcs'
  confidence_score: number
  template_info?: {
    is_template_issue: boolean
    occurrence_count: number
    fix_scope: 'theme_level' | 'component_level' | 'content_level'
  }
  processing_metadata: {
    runners: string[]
    merged_from: number
    partial?: boolean
  }
  screenshotUrl?: string
}

interface EnhancedIssue extends ProcessedIssue {
  description: string
  recommended_action: string
  affected_disabilities: string[]
  wcag_code: string
  screenshotUrl?: string
}

interface BatchResult {
  batch_id: string
  success: boolean
  enhanced_issues: EnhancedIssue[]
  error?: string
  retry_count: number
}

// GPT Function schema for structured output
const GPT_FUNCTION_SCHEMA = {
  type: 'function' as const,
  function: {
    name: 'enhance_accessibility_issues',
    description: 'Enhance accessibility issues with descriptions, recommendations, and template analysis',
    parameters: {
      type: 'object',
      properties: {
        enhanced_issues: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              original_code: {
                type: 'string',
                description: 'The original issue code/message',
              },
              description: {
                type: 'string',
                description: 'Clear description of the accessibility issue and its impact',
              },
              recommended_action: {
                type: 'string',
                description: 'Specific actionable steps to fix the issue',
              },
              wcag_code: {
                type: 'string',
                description: "WCAG guideline number (e.g., '1.4.3')",
              },
              affected_disabilities: {
                type: 'array',
                items: { type: 'string' },
                description: "List of disabilities most affected (e.g., ['blind', 'low-vision', 'motor'])",
              },
              template_analysis: {
                type: 'object',
                properties: {
                  is_template_issue: { type: 'boolean' },
                  fix_scope: {
                    type: 'string',
                    enum: ['theme_level', 'component_level', 'content_level'],
                  },
                  template_fix_instructions: { type: 'string' },
                },
              },
              confidence_assessment: {
                type: 'object',
                properties: {
                  severity: {
                    type: 'string',
                    enum: ['critical', 'high', 'medium', 'low'],
                  },
                  fix_effort: {
                    type: 'string',
                    enum: ['minimal', 'moderate', 'significant'],
                  },
                },
              },
            },
            required: ['original_code', 'description', 'recommended_action', 'wcag_code', 'affected_disabilities'],
          },
        },
      },
      required: ['enhanced_issues'],
    },
  },
}

/**
 * Create detailed batch prompt for quality + speed balance
 */
function createQualityBatchPrompt(issues: ProcessedIssue[]): string {
  const issueList = issues
    .map((issue, index) => {
      const templateInfo = issue.template_info ? ` (Template: ${issue.template_info.occurrence_count}x, ${issue.template_info.fix_scope})` : ''

      return `${index + 1}. **${issue.code}**
   Message: ${issue.message}
   Context: ${issue.context.slice(0, 2).join('; ')}
   Selectors: ${issue.selectors.slice(0, 2).join(', ')}
   Confidence: ${issue.confidence_score}${templateInfo}`
    })
    .join('\n\n')

  return `You are an expert accessibility consultant. Analyze these ${issues.length} accessibility issues with detailed attention to each one.

For EACH issue, provide:
1. **Description**: Clear explanation of the problem and user impact (2-3 sentences)
2. **Recommended Action**: Specific step-by-step fix instructions 
3. **WCAG Code**: Exact guideline number (e.g., "1.4.3")
4. **Affected Disabilities**: Primary disability groups affected (e.g., ["blind", "low-vision"])

Issues to analyze:
${issueList}

Return structured JSON with detailed analysis for ALL ${issues.length} issues. Be thorough and specific for each one.`
}

/**
 * Process batch with quality focus - smaller batches, detailed prompts
 */
async function processBatch(batchId: string, issues: ProcessedIssue[], retryCount = 0): Promise<BatchResult> {
  const maxRetries = 1

  try {
    const prompt = createQualityBatchPrompt(issues)

    const completion = await openai.chat.completions.create({
      model: 'google/gemini-2.5-flash-preview-05-20', // Quality model
      messages: [
        {
          role: 'system',
          content: 'You are an expert accessibility consultant. Provide detailed, specific analysis for each accessibility issue. Be thorough while maintaining efficiency.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      tools: [GPT_FUNCTION_SCHEMA],
      tool_choice: { type: 'function', function: { name: 'enhance_accessibility_issues' } },
      temperature: 0.1,
      max_tokens: 3000, // More tokens for detailed batch responses
    })

    const toolCall = completion.choices[0]?.message?.tool_calls?.[0]
    if (!toolCall || !toolCall.function.arguments) {
      throw new Error('No structured response received from GPT')
    }

    const result = JSON.parse(toolCall.function.arguments)
    const enhancedIssues = result.enhanced_issues

    // Validate and merge results with proper fallbacks
    const finalIssues: EnhancedIssue[] = issues.map((originalIssue, index) => {
      const enhancement = enhancedIssues[index] || {}

      return {
        ...originalIssue,
        description: enhancement.description || generateDetailedFallbackDescription(originalIssue),
        recommended_action: enhancement.recommended_action || generateDetailedFallbackAction(originalIssue),
        affected_disabilities: enhancement.affected_disabilities || generateFallbackDisabilities(originalIssue),
        wcag_code: enhancement.wcag_code || extractWCAGCode(originalIssue.code) || 'N/A',
      }
    })

    return {
      batch_id: batchId,
      success: true,
      enhanced_issues: finalIssues,
      retry_count: retryCount,
    }
  } catch (error) {
    if (retryCount < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      return processBatch(batchId, issues, retryCount + 1)
    }

    // Detailed fallback for each issue
    const fallbackIssues: EnhancedIssue[] = issues.map((issue) => ({
      ...issue,
      description: generateDetailedFallbackDescription(issue),
      recommended_action: generateDetailedFallbackAction(issue),
      affected_disabilities: generateFallbackDisabilities(issue),
      wcag_code: extractWCAGCode(issue.code) || 'N/A',
    }))

    return {
      batch_id: batchId,
      success: false,
      enhanced_issues: fallbackIssues,
      error: `Batch failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      retry_count: retryCount,
    }
  }
}

/**
 * Process batches with optimal size for quality + speed
 */
export async function processBatches(batches: { batch_id: string; issues: ProcessedIssue[] }[]): Promise<BatchResult[]> {
  const maxConcurrency = 12 // Good balance
  const results: BatchResult[] = []

  // Process batches in chunks with controlled concurrency
  for (let i = 0; i < batches.length; i += maxConcurrency) {
    const chunk = batches.slice(i, i + maxConcurrency)
    const chunkPromises = chunk.map((batch) => processBatch(batch.batch_id, batch.issues))

    const chunkResults = await Promise.all(chunkPromises)
    results.push(...chunkResults)

    // Brief pause between chunks
    if (i + maxConcurrency < batches.length) {
      await new Promise((resolve) => setTimeout(resolve, 300))
    }
  }

  return results
}

/**
 * Fallback disabilities generator
 */
function generateFallbackDisabilities(issue: ProcessedIssue): string[] {
  if (issue.code.includes('contrast') || issue.code.includes('color')) {
    return ['low-vision', 'color-blind']
  }
  if (issue.code.includes('alt') || issue.code.includes('image')) {
    return ['blind']
  }
  if (issue.code.includes('heading') || issue.code.includes('focus')) {
    return ['blind', 'motor']
  }
  return ['multiple']
}

/**
 * Extract WCAG code from issue code
 */
function extractWCAGCode(code: string): string | null {
  const wcagMatch = code.match(/(\d+\.\d+\.\d+)/)
  return wcagMatch ? wcagMatch[1] : null
}

/**
 * Generate detailed fallback description for better quality
 */
function generateDetailedFallbackDescription(issue: ProcessedIssue): string {
  const context = issue.context.join(' ').substring(0, 200)
  const selector = issue.selectors[0] || 'element'

  if (issue.code.includes('contrast')) {
    return `Color contrast issue detected on ${selector}. The text and background colors may not meet WCAG standards, making content difficult to read for users with low vision or color blindness. Context: ${context}`
  }
  if (issue.code.includes('alt') || issue.code.includes('image')) {
    return `Image accessibility issue found on ${selector}. Images may be missing alternative text, preventing screen reader users from understanding visual content. Context: ${context}`
  }
  if (issue.code.includes('heading')) {
    return `Heading structure issue on ${selector}. Improper heading hierarchy can confuse users navigating with assistive technology. Context: ${context}`
  }
  if (issue.code.includes('button') || issue.code.includes('link')) {
    return `Interactive element ${selector} may be missing accessible name or description, preventing assistive technology users from understanding its purpose. Context: ${context}`
  }

  return `Accessibility issue detected on ${selector}. This may impact users with disabilities who rely on assistive technology. Issue: ${issue.message.substring(0, 100)}. Context: ${context}`
}

/**
 * Generate detailed fallback action for better quality
 */
function generateDetailedFallbackAction(issue: ProcessedIssue): string {
  if (issue.code.includes('contrast')) {
    return '1. Check current color contrast ratio using a contrast checker tool. 2. Adjust either text color or background color to achieve at least 4.5:1 ratio for normal text or 3:1 for large text. 3. Test with users who have visual impairments if possible.'
  }
  if (issue.code.includes('alt') || issue.code.includes('image')) {
    return "1. Add meaningful alt text that describes the image's content or function. 2. For decorative images, use empty alt text (alt=''). 3. For complex images, consider adding longer descriptions using aria-describedby."
  }
  if (issue.code.includes('heading')) {
    return "1. Review heading structure to ensure logical hierarchy (h1, h2, h3, etc.). 2. Don't skip heading levels. 3. Use headings for structure, not just styling. 4. Test with screen reader navigation."
  }

  return '1. Review the accessibility requirements for this type of element. 2. Implement appropriate ARIA attributes or semantic HTML. 3. Test with assistive technology. 4. Validate against WCAG guidelines.'
}

/**
 * Merge batch results back into original format
 */
export function mergeBatchResults(batchResults: BatchResult[]): {
  axe: { errors: any[]; warnings: any[]; notices: any[] }
  htmlcs: { errors: any[]; warnings: any[]; notices: any[] }
  processing_stats: {
    total_batches: number
    successful_batches: number
    failed_batches: number
    total_issues: number
  }
} {
  const result = {
    axe: { errors: [] as any[], warnings: [] as any[], notices: [] as any[] },
    htmlcs: { errors: [] as any[], warnings: [] as any[], notices: [] as any[] },
    processing_stats: {
      total_batches: batchResults.length,
      successful_batches: batchResults.filter((r) => r.success).length,
      failed_batches: batchResults.filter((r) => !r.success).length,
      total_issues: 0,
    },
  }

  batchResults.forEach((batch) => {
    batch.enhanced_issues.forEach((issue) => {
      result.processing_stats.total_issues++

      const targetRunner = issue.runner === 'axe' ? 'axe' : 'htmlcs'
      const targetType = `${issue.type}s` as 'errors' | 'warnings' | 'notices'

      const finalIssue = {
        code: issue.code,
        message: issue.message,
        context: issue.context,
        selectors: issue.selectors,
        description: issue.description,
        recommended_action: issue.recommended_action,
        affected_disabilities: issue.affected_disabilities,
        wcag_code: issue.wcag_code,
        // Include preprocessing metadata
        confidence_score: issue.confidence_score,
        template_info: issue.template_info,
        processing_metadata: {
          ...issue.processing_metadata,
          batch_id: batch.batch_id,
          gpt_success: batch.success,
          retry_count: batch.retry_count,
        },
        screenshotUrl: issue.screenshotUrl,
      }

      result[targetRunner][targetType].push(finalIssue)
    })
  })

  return result
}
