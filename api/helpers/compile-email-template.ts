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

    return template(escapedData)
  } catch (error) {
    logger.error('Error compiling email template:', error)
    throw error
  }
}

function escapeHandlebarsExpressions(str: string): string {
  return str.replace(/{{/g, '&#123;&#123;').replace(/}}/g, '&#125;&#125;')
}
