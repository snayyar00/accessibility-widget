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
    [key: string]: any
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

    const { html, errors } = mjml2html(mjmlContent, {
      keepComments: false,
      beautify: false,
      minify: true,
    })

    if (errors && errors.length > 0) {
      logger.warn('MJML compilation warnings:', errors)
    }

    // Debug: Check if Handlebars conditionals are preserved in HTML
    if (fileName.includes('day1FollowUp')) {
      console.log('🔍 DEBUG: Checking Handlebars conditionals in HTML output')
      const hasConditionals = html.includes('{{#if hasActiveDomains}}')
      const hasElse = html.includes('{{else}}')
      const hasEndIf = html.includes('{{/if}}')
      console.log(`Conditionals preserved: {{#if}}: ${hasConditionals}, {{else}}: ${hasElse}, {{/if}}: ${hasEndIf}`)
      
      if (!hasConditionals || !hasElse || !hasEndIf) {
        console.log('⚠️ WARNING: MJML compilation may have corrupted Handlebars syntax')
      }
    }

    // Escape all string values in data using entities

    const escapedData: typeof data = {}

    for (const key in data) {
      if (typeof data[key] === 'string') {
        escapedData[key] = escapeHandlebarsExpressions(data[key])
      } else {
        escapedData[key] = data[key]
      }
    }

    const template = handlebars.compile(html)

    // Debug: For Day 1 email, log the template data
    if (fileName.includes('day1FollowUp')) {
      console.log('🔍 DEBUG: Template data being passed to Handlebars:')
      console.log(`hasActiveDomains: ${JSON.stringify(escapedData.hasActiveDomains)} (type: ${typeof escapedData.hasActiveDomains})`)
    }

    return template(escapedData)
  } catch (error) {
    logger.error('Error compiling email template:', error)
    throw error
  }
}

function escapeHandlebarsExpressions(str: string): string {
  return str.replace(/{{/g, '&#123;&#123;').replace(/}}/g, '&#125;&#125;')
}
