import fs from 'fs'
import handlebars from 'handlebars'
import mjml2html from 'mjml'
import path from 'path'

import logger from '../utils/logger'

handlebars.registerHelper('eq', (a, b) => a === b)

type Props = {
  fileName: string
  data: {
    date?: string
    name?: string
    url?: string
    teamName?: string
    link?: string
    /** Brand/organization name shown in email (defaults to "WebAbility" when omitted) */
    organizationName?: string
    [key: string]: unknown
  }
}

export default async function compileEmailTemplate({ fileName, data }: Props): Promise<string> {
  try {
    const possiblePaths = [path.join(process.cwd(), 'dist', 'email-templates', fileName), path.join(process.cwd(), 'api', 'email-templates', fileName), path.join(__dirname, '..', 'email-templates', fileName)]

    let mjmlContent: string | null = null
    let usedPath: string | null = null

    for (const mjmlPath of possiblePaths) {
      try {
        mjmlContent = await fs.promises.readFile(mjmlPath, 'utf8')
        usedPath = mjmlPath
        break
      } catch {
        // File not found, try next path
      }
    }

    if (!mjmlContent || !usedPath) {
      throw new Error(`Unable to find email template: ${fileName}`)
    }

    logger.info(`Successfully read MJML file from: ${usedPath}`)

    // Pre-process MJML template for Handlebars conditionals before MJML compilation
    // This is needed because MJML strips out Handlebars syntax
    if (fileName.includes('day1FollowUp')) {
      mjmlContent = preprocessHandlebarsConditionals(mjmlContent, data)
    }

    const { html, errors } = mjml2html(mjmlContent, {
      keepComments: false,
      beautify: false,
      minify: true,
    })

    if (errors && errors.length > 0) {
      logger.warn('MJML compilation warnings:', errors)
    }

    // Escape all string values in data using entities; ensure organizationName has a default for templates
    const escapedData: typeof data = {
      ...data,
      organizationName: typeof data.organizationName === 'string' && data.organizationName.trim() ? data.organizationName.trim() : 'WebAbility',
    }

    for (const key in escapedData) {
      if (typeof escapedData[key] === 'string') {
        escapedData[key] = escapeHandlebarsExpressions(escapedData[key] as string)
      }
    }

    const template = handlebars.compile(html)

    return template(escapedData)
  } catch (error) {
    logger.error('Error compiling email template:', error)
    throw error
  }
}

function escapeHandlebarsExpressions(str: string): string {
  return str.replace(/{{/g, '&#123;&#123;').replace(/}}/g, '&#125;&#125;')
}

/**
 * Preprocess MJML template to handle Handlebars conditionals
 * This is needed because MJML strips out Handlebars syntax
 */
function preprocessHandlebarsConditionals(mjmlContent: string, data: Record<string, unknown>): string {
  // Handle Day 1 email conditional sections
  if (data.hasActiveDomains !== undefined) {
    const hasActiveDomains = Boolean(data.hasActiveDomains)

    // First, process the large block conditional (lines 55-143)
    // This needs to be processed before the inline conditional to avoid conflicts
    const blockConditionalRegex = /^(\s*){{#if hasActiveDomains}}\s*$([\s\S]*?)^(\s*){{else}}\s*$([\s\S]*?)^(\s*){{\/if}}\s*$/gm

    mjmlContent = mjmlContent.replace(blockConditionalRegex, (match, _indent1, trueBranch, _indent2, falseBranch, _indent3) => {
      return hasActiveDomains ? trueBranch : falseBranch
    })

    // Then process inline conditionals in text content: {{#if hasActiveDomains}}text1{{else}}text2{{/if}}
    const inlineConditionalRegex = /{{#if hasActiveDomains}}([^{]*?){{else}}([^{]*?){{\/if}}/g

    mjmlContent = mjmlContent.replace(inlineConditionalRegex, (match, trueText, falseText) => {
      return hasActiveDomains ? trueText : falseText
    })
  }

  return mjmlContent
}
