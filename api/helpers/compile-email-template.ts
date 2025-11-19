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
    
    // Preprocess billingLink template for pastCustomerLogo conditional
    if (fileName.includes('billingLink')) {
      mjmlContent = preprocessBillingLinkConditionals(mjmlContent, data)
    }

    const { html, errors } = mjml2html(mjmlContent, {
      keepComments: false,
      beautify: false,
      minify: true,
    })

    if (errors && errors.length > 0) {
      logger.warn('MJML compilation warnings:', errors)
    }

    // Escape all string values in data using entities
    // BUT don't escape image URLs (base64 data URLs or HTTP URLs) as they need to remain intact
    const escapedData: typeof data = {}

    for (const key in data) {
      if (typeof data[key] === 'string') {
        const value = data[key].toString()
        // Don't escape image URLs (base64 data URLs or HTTP/HTTPS URLs)
        if (key === 'pastCustomerLogo' && (value.startsWith('data:image') || value.startsWith('http://') || value.startsWith('https://'))) {
          escapedData[key] = data[key]
        } else {
          escapedData[key] = escapeHandlebarsExpressions(data[key])
        }
      } else {
        escapedData[key] = data[key]
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

/**
 * Preprocess billingLink template to handle pastCustomerLogo conditional
 */
function preprocessBillingLinkConditionals(mjmlContent: string, data: Record<string, unknown>): string {
  if (data.pastCustomerLogo !== undefined) {
    const hasLogo = Boolean(data.pastCustomerLogo && String(data.pastCustomerLogo).trim().length > 0)
    
    // Process block conditionals: {{#if pastCustomerLogo}}...{{/if}}
    const blockConditionalRegex = /{{#if pastCustomerLogo}}([\s\S]*?){{\/if}}/g
    
    mjmlContent = mjmlContent.replace(blockConditionalRegex, (match, content) => {
      return hasLogo ? content : ''
    })
  }
  
  return mjmlContent
}
