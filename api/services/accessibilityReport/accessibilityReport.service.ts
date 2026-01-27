import { Scrapeless } from '@scrapeless-ai/sdk'
import fs from 'fs'
import path from 'path'
import puppeteer from 'puppeteer-core'
import { getScrapelessScreenshotService } from '../scrapeless-screenshot.service'

import { getAccessibilityInformationPally } from '../../helpers/accessibility.helper'
import { formatUrlForScan, getRetryUrls } from '../../utils/domain.utils'
import { GPTChunks } from './accessibilityIssues.service'
import { accessibilityReportQueue } from './accessibilityReportQueue.service'
import { QUEUE_PRIORITY } from '../../constants/queue-priority.constant'
// interface Category {
//     description: string;
//     count: number;
//     items?: { [key: string]: CategoryItem };
// }

function createAxeArrayObj(message: string, issue: any) {
  const obj: axeOutput = {
    message,
    context: Array.isArray(issue.context) ? issue.context : [issue.context],
    selectors: Array.isArray(issue.selectors) ? issue.selectors : [issue.selectors],
    impact: issue.impact || 'moderate',
    description: issue.description || '',
    help: issue.recommended_action || '',
    wcag_code: issue.wcag_code,
    screenshotUrl: issue.screenshotUrl || undefined,
    pages_affected: issue.pages_affected || undefined,
  }
  return obj
}
function createHtmlcsArrayObj(issue: any) {
  const obj: htmlcsOutput = {
    code: issue.code || '',
    message: issue.message || '',
    context: Array.isArray(issue.context) ? issue.context : [issue.context],
    selectors: Array.isArray(issue.selectors) ? issue.selectors : [issue.selectors],
    wcag_code: issue.wcag_code,
    screenshotUrl: issue.screenshotUrl || undefined,
    pages_affected: issue.pages_affected || undefined,
  }
  return obj
}

interface Error {
  ErrorGuideline?: string
  code?: string
  wcag_code?: string
  description?: string | string[]
  message?: string | string[]
  context?: string | string[]
  recommended_action?: string | string[]
  selectors?: string | string[]
}

interface HumanFunctionality {
  FunctionalityName: string
  Errors: Error[]
}

interface GPTData {
  HumanFunctionalities: HumanFunctionality[]
}

export interface htmlcsOutput {
  code: string
  message?: string
  context?: string[]
  selectors?: string[]
  description?: string
  recommended_action?: string
  wcag_code?: string
  screenshotUrl?: string
  pages_affected?: string[]
}
interface axeOutput {
  message: string
  context: string[]
  selectors: string[]
  impact: string
  description: string
  help: string
  wcag_code?: string
  screenshotUrl?: string
  pages_affected?: string[]
}

interface ResultWithOriginal {
  axe?: any
  htmlcs?: any
  score?: number
  totalElements?: number
  siteImg?: string
  ByFunctions?: any[]
  processing_stats?: any
  _originalHtmlcs?: {
    errors: htmlcsOutput[]
    notices: htmlcsOutput[]
    warnings: htmlcsOutput[]
  }
  scriptCheckResult?: string
  issues?: any[] // Array of extracted issues
  techStack?: any
  issuesByFunction?: { [key: string]: any[] } // Grouped issues by functionality
  functionalityNames?: string[] // List of functionality names
  totalStats?: {
    score: number
    originalScore: number
    criticalIssues: number
    warnings: number
    moderateIssues: number
    totalElements: number
    hasWebAbility: boolean
  } // Aggregated statistics
}

// Initialize output object to store merged results
function mergeIssuesToOutput(issues: any[]): {
  axe: {
    errors: axeOutput[]
    notices: axeOutput[]
    warnings: axeOutput[]
  }
  htmlcs: {
    errors: htmlcsOutput[]
    notices: htmlcsOutput[]
    warnings: htmlcsOutput[]
  }
  totalElements: number
} {
  const output = {
    axe: {
      errors: [] as axeOutput[],
      notices: [] as axeOutput[],
      warnings: [] as axeOutput[],
    },
    htmlcs: {
      errors: [] as htmlcsOutput[],
      notices: [] as htmlcsOutput[],
      warnings: [] as htmlcsOutput[],
    },
    totalElements: 0,
  }

  issues.forEach((issue: any) => {
    // Determine runner and type based on the actual data structure
    const runner = issue.source === 'AXE Core' ? 'axe' : issue.source === 'HTML_CS' ? 'htmlcs' : 'unknown'
    const type = issue.impact === 'critical' ? 'error' : issue.impact === 'serious' ? 'warning' : 'notice'

    if (runner === 'axe') {
      // Normalize message for comparison (remove extra whitespace and parentheses)
      const normalizedMessage = issue.message.replace(/\s*\(.*$/, '').trim()
      if (type === 'error') {
        const errorIndex = output.axe.errors.findIndex((error: any) => error.message === normalizedMessage)
        if (errorIndex === -1) {
          const obj: axeOutput = createAxeArrayObj(normalizedMessage, issue)
          output.axe.errors.push(obj)
          if (obj.screenshotUrl) {
            console.log('[mergeIssuesToOutput][AXE][error] screenshotUrl:', obj.screenshotUrl, 'message:', obj.message)
          }
        } else {
          // Append context and selectors to existing error
          const contextToAdd = Array.isArray(issue.context) ? issue.context : issue.context ? [issue.context] : []
          const selectorToAdd = Array.isArray(issue.selectors) ? issue.selectors : issue.selectors ? [issue.selectors] : []
          const pagesToAdd = Array.isArray(issue.pages_affected) ? issue.pages_affected : issue.pages_affected ? [issue.pages_affected] : []
          output.axe.errors[errorIndex].context.push(...contextToAdd)
          output.axe.errors[errorIndex].selectors.push(...selectorToAdd)
          if (pagesToAdd.length > 0) {
            output.axe.errors[errorIndex].pages_affected = [...(output.axe.errors[errorIndex].pages_affected || []), ...pagesToAdd]
          }
        }
      } else if (type === 'notice') {
        const noticeIndex = output.axe.notices.findIndex((notice: any) => notice.message === normalizedMessage)
        if (noticeIndex === -1) {
          const obj: axeOutput = createAxeArrayObj(normalizedMessage, issue)
          output.axe.notices.push(obj)
          if (obj.screenshotUrl) {
            console.log('[mergeIssuesToOutput][AXE][notice] screenshotUrl:', obj.screenshotUrl, 'message:', obj.message)
          }
        } else {
          const contextToAdd = Array.isArray(issue.context) ? issue.context : [issue.context]
          const selectorToAdd = Array.isArray(issue.selectors) ? issue.selectors : [issue.selectors]
          const pagesToAdd = Array.isArray(issue.pages_affected) ? issue.pages_affected : issue.pages_affected ? [issue.pages_affected] : []
          output.axe.notices[noticeIndex].context.push(...contextToAdd)
          output.axe.notices[noticeIndex].selectors.push(...selectorToAdd)
          if (pagesToAdd.length > 0) {
            output.axe.notices[noticeIndex].pages_affected = [...(output.axe.notices[noticeIndex].pages_affected || []), ...pagesToAdd]
          }
        }
      } else if (type === 'warning') {
        const warningIndex = output.axe.warnings.findIndex((warning: any) => warning.message === normalizedMessage)
        if (warningIndex === -1) {
          const obj: axeOutput = createAxeArrayObj(normalizedMessage, issue)
          output.axe.warnings.push(obj)
          if (obj.screenshotUrl) {
            console.log('[mergeIssuesToOutput][AXE][warning] screenshotUrl:', obj.screenshotUrl, 'message:', obj.message)
          }
        } else {
          const contextToAdd = Array.isArray(issue.context) ? issue.context : [issue.context]
          const selectorToAdd = Array.isArray(issue.selectors) ? issue.selectors : [issue.selectors]
          const pagesToAdd = Array.isArray(issue.pages_affected) ? issue.pages_affected : issue.pages_affected ? [issue.pages_affected] : []
          output.axe.warnings[warningIndex].context.push(...contextToAdd)
          output.axe.warnings[warningIndex].selectors.push(...selectorToAdd)
          if (pagesToAdd.length > 0) {
            output.axe.warnings[warningIndex].pages_affected = [...(output.axe.warnings[warningIndex].pages_affected || []), ...pagesToAdd]
          }
        }
      }
      output.totalElements += 1
    } else if (runner === 'htmlcs') {
      // Normalize message for comparison
      const normalizedMessage = issue.message.trim()
      if (type === 'error') {
        const errorIndex = output.htmlcs.errors.findIndex((error: any) => error.message === normalizedMessage)
        if (errorIndex === -1) {
          const obj: htmlcsOutput = createHtmlcsArrayObj(issue)
          obj.message = normalizedMessage
          output.htmlcs.errors.push(obj)
          if (obj.screenshotUrl) {
            console.log('[mergeIssuesToOutput][HTMLCS][error] screenshotUrl:', obj.screenshotUrl, 'message:', obj.message)
          }
        } else {
          const contextToAdd = Array.isArray(issue.context) ? issue.context : [issue.context]
          const selectorToAdd = Array.isArray(issue.selectors) ? issue.selectors : [issue.selectors]
          const pagesToAdd = Array.isArray(issue.pages_affected) ? issue.pages_affected : issue.pages_affected ? [issue.pages_affected] : []
          output.htmlcs.errors[errorIndex].context.push(...contextToAdd)
          output.htmlcs.errors[errorIndex].selectors.push(...selectorToAdd)
          if (pagesToAdd.length > 0) {
            output.htmlcs.errors[errorIndex].pages_affected = [...(output.htmlcs.errors[errorIndex].pages_affected || []), ...pagesToAdd]
          }
        }
      } else if (type === 'notice') {
        const noticeIndex = output.htmlcs.notices.findIndex((notice: any) => notice.message === normalizedMessage)
        if (noticeIndex === -1) {
          const obj: htmlcsOutput = createHtmlcsArrayObj(issue)
          obj.message = normalizedMessage
          output.htmlcs.notices.push(obj)
          if (obj.screenshotUrl) {
            console.log('[mergeIssuesToOutput][HTMLCS][notice] screenshotUrl:', obj.screenshotUrl, 'message:', obj.message)
          }
        } else {
          const contextToAdd = Array.isArray(issue.context) ? issue.context : [issue.context]
          const selectorToAdd = Array.isArray(issue.selectors) ? issue.selectors : [issue.selectors]
          const pagesToAdd = Array.isArray(issue.pages_affected) ? issue.pages_affected : issue.pages_affected ? [issue.pages_affected] : []
          output.htmlcs.notices[noticeIndex].context.push(...contextToAdd)
          output.htmlcs.notices[noticeIndex].selectors.push(...selectorToAdd)
          if (pagesToAdd.length > 0) {
            output.htmlcs.notices[noticeIndex].pages_affected = [...(output.htmlcs.notices[noticeIndex].pages_affected || []), ...pagesToAdd]
          }
        }
      } else if (type === 'warning') {
        const warningIndex = output.htmlcs.warnings.findIndex((warning: any) => warning.message === normalizedMessage)
        if (warningIndex === -1) {
          const obj: htmlcsOutput = createHtmlcsArrayObj(issue)
          obj.message = normalizedMessage
          output.htmlcs.warnings.push(obj)
          if (obj.screenshotUrl) {
            console.log('[mergeIssuesToOutput][HTMLCS][warning] screenshotUrl:', obj.screenshotUrl, 'message:', obj.message)
          }
        } else {
          const contextToAdd = Array.isArray(issue.context) ? issue.context : [issue.context]
          const selectorToAdd = Array.isArray(issue.selectors) ? issue.selectors : [issue.selectors]
          const pagesToAdd = Array.isArray(issue.pages_affected) ? issue.pages_affected : issue.pages_affected ? [issue.pages_affected] : []
          output.htmlcs.warnings[warningIndex].context.push(...contextToAdd)
          output.htmlcs.warnings[warningIndex].selectors.push(...selectorToAdd)
          if (pagesToAdd.length > 0) {
            output.htmlcs.warnings[warningIndex].pages_affected = [...(output.htmlcs.warnings[warningIndex].pages_affected || []), ...pagesToAdd]
          }
        }
      }
    }
  })
  return output
}

/**
 * Takes a screenshot of a given URL using SCRAPELESS and puppeteer-core
 * @param url - The URL to take a screenshot of
 * @param options - Optional configuration for the screenshot
 * @returns Promise<string> - Base64 encoded screenshot data
 */
/**
 * Detects if a website has accessibility widget scripts loaded
 * @param page - Puppeteer page object
 * @returns Promise<{found: boolean, scripts: Array<{url: string, isExactMatch: boolean}>}>
 */
export async function detectAccessibilityWidget(page: any): Promise<{
  found: boolean
  scripts: Array<{ url: string; isExactMatch: boolean }>
}> {
  const widgetScripts = await page.evaluate(() => {
    // @ts-ignore - This code runs in browser context where document is available
    const scripts = Array.from(document.querySelectorAll('script[src]'))
    const widgetUrls = ['https://widget.access-widget.com/widget.min.js', 'https://widget.webability.io/widget.min.js','https://widget-v2.webability.io/widget.min.js']

    const foundWidgets: Array<{ url: string; isExactMatch: boolean }> = []

    scripts.forEach((script: any) => {
      const src = script.getAttribute('src')
      if (src) {
        widgetUrls.forEach((widgetUrl) => {
          if (src.includes(widgetUrl) || src.includes('widget.min.js')) {
            foundWidgets.push({
              url: src,
              isExactMatch: src.includes(widgetUrl),
            })
          }
        })
      }
    })

    return foundWidgets
  })

  return {
    found: widgetScripts.length > 0,
    scripts: widgetScripts,
  }
}

export async function takeScreenshot(
  url: string,
  options: {
    format?: 'jpeg' | 'png'
    quality?: number
    fullPage?: boolean
    width?: number
    height?: number
  } = {},
): Promise<string> {
  const { format = 'jpeg', quality = 80, fullPage = false, width = 1920, height = 1080 } = options

  let browser: any = null
  let session: any = null

  try {
    console.log(`📸 Starting screenshot capture for URL: ${url}`)

    console.log('🔗 Connecting to remote browser...')

    // Validate API key before attempting connection
    const apiKey = process.env.SCRAPELESS_API_KEY
    if (!apiKey) {
      throw new Error('SCRAPELESS_API_KEY environment variable is not set')
    }
    if (apiKey.trim() === '') {
      throw new Error('SCRAPELESS_API_KEY environment variable is empty')
    }

    // Initialize SCRAPELESS client and create browser session
    const client = new Scrapeless({
      apiKey: apiKey,
    })

    const { browserWSEndpoint } = await client.browser.create({
      sessionName: `screenshot-${Date.now()}`,
      sessionTTL: 300, // 5 minutes
    })

    // Connect to the browser using Puppeteer
    browser = await puppeteer.connect({
      browserWSEndpoint: browserWSEndpoint,
    })

    // Get the first page or create a new one
    const pages = await browser.pages()
    const page = pages[0] || (await browser.newPage())

    // Set viewport size
    await page.setViewport({ width, height })

    // Handle blocking JS dialogs
    page.on('dialog', async (dialog: any) => {
      console.log(`⚠️ Closing dialog: ${dialog.message()}`)
      await dialog.dismiss()
    })

    // Handle popup windows
    browser.on('targetcreated', async (target: any) => {
      if (target.type() === 'page') {
        const newPage = await target.page()
        if (newPage) {
          console.log('🪟 Closing unwanted popup window...')
          await newPage.close()
        }
      }
    })

    console.log(`🌐 Navigating to: ${url}`)

    // Navigate to the URL with increased timeout and more lenient wait strategy
    try {
      await page.goto(url, {
        waitUntil: 'domcontentloaded', // More lenient than networkidle2
        timeout: 60000, // Increased from 30000 to 60000 (60 seconds)
      })
    } catch (navError) {
      // If navigation fails, try with load event as fallback
      console.warn(`⚠️ Initial navigation failed, retrying with 'load' strategy...`)
      try {
        await page.goto(url, {
          waitUntil: 'load',
          timeout: 60000,
        })
      } catch (retryError) {
        // If still fails, try with no wait strategy
        console.warn(`⚠️ Load strategy failed, trying with minimal wait...`)
        await page.goto(url, {
          waitUntil: 'commit',
          timeout: 60000,
        })
      }
    }

    // Check for accessibility widget scripts
    console.log('🔍 Checking for accessibility widget scripts...')
    const widgetDetection = await detectAccessibilityWidget(page)

    if (widgetDetection.found) {
      console.log('✅ Found accessibility widget scripts:')
      widgetDetection.scripts.forEach((widget) => {
        console.log(`   - ${widget.url} ${widget.isExactMatch ? '(exact match)' : '(contains widget.min.js)'}`)
      })
    } else {
      console.log('ℹ️  No accessibility widget scripts found on this page')
    }

    console.log('📷 Taking screenshot using CDP...')

    // Create a CDP session for faster screenshots
    const cdpClient = await page.createCDPSession()

    // Remove DOM-based banners/modals
    const getModalSelectors = () => {
      return process.env.MODAL_SELECTORS?.split(',') || ['#cookie-banner', '.cookie-consent', '.popup', '.modal', '.overlay']
    }

    await page.evaluate((selectorsToRemove: string[]) => {
      for (const selector of selectorsToRemove) {
        // @ts-ignore - This code runs in browser context where document is available
        document.querySelectorAll(selector).forEach((element: any) => element.remove())
      }
    }, getModalSelectors())
    // Capture the screenshot using CDP
    const { data } = await cdpClient.send('Page.captureScreenshot', {
      format,
      quality: format === 'jpeg' ? quality : undefined,
      fullPage,
    })

    console.log('✅ Screenshot captured successfully')

    return data
  } catch (error) {
    console.error('❌ Error taking screenshot:', error)
    throw new Error(`Failed to take screenshot: ${error instanceof Error ? error.message : 'Unknown error'}`)
  } finally {
    // Clean up resources
    try {
      if (browser) {
        console.log('🔌 Closing browser connection...')
        await browser.close()
      }
    } catch (cleanupError) {
      console.error('⚠️ Error during cleanup:', cleanupError)
    }
  }
}

/**
 * Takes a screenshot and saves it to a file
 * @param url - The URL to take a screenshot of
 * @param filePath - The path where to save the screenshot file
 * @param options - Optional configuration for the screenshot
 * @returns Promise<string> - The file path where the screenshot was saved
 */
export async function takeScreenshotAndSave(
  url: string,
  filePath: string,
  options: {
    format?: 'jpeg' | 'png'
    quality?: number
    fullPage?: boolean
    width?: number
    height?: number
  } = {},
): Promise<string> {
  try {
    // Take the screenshot
    const screenshotData = await takeScreenshot(url, options)

    // Convert base64 to buffer
    const buffer = Buffer.from(screenshotData, 'base64')

    // Ensure directory exists
    const dir = path.dirname(filePath)
    if (dir && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    // Write the file
    fs.writeFileSync(filePath, buffer)

    console.log(`💾 Screenshot saved to: ${filePath}`)

    return filePath
  } catch (error) {
    console.error('❌ Error saving screenshot:', error)
    throw new Error(`Failed to save screenshot: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Takes a screenshot with retry logic for the main accessibility function
 * @param domain - The domain to take a screenshot of
 * @param retryCount - Current retry count (internal use)
 * @returns Promise<string | null> - Base64 screenshot data or null if all retries fail
 */
/**
 * Takes a screenshot and detects widgets with retry logic
 * @param domain - The domain to take a screenshot of
 * @param retryCount - Current retry count (internal use)
 * @returns Promise<{screenshot: string | null, widgetDetection: {found: boolean, scripts: Array<{url: string, isExactMatch: boolean}>}} | null>
 */
async function takeScreenshotWithWidgetDetection(
  domain: string,
  retryCount = 0,
): Promise<{
  screenshot: string | null
  widgetDetection: { found: boolean; scripts: Array<{ url: string; isExactMatch: boolean }> }
} | null> {
  const maxRetries = 3
  const baseDelay = 1000
  const delay = Math.min(baseDelay * Math.pow(1.5, retryCount), 8000)

  try {
    console.log(`📸 Taking screenshot with widget detection (attempt ${retryCount + 1}/${maxRetries + 1})...`)

    // Add some randomization to avoid conflicts
    const jitter = Math.random() * 300
    if (retryCount > 0) {
      console.log(`⏳ Adding ${Math.round(jitter)}ms jitter to avoid conflicts...`)
      await new Promise((resolve) => setTimeout(resolve, jitter))
    }

    // Use Web Unlocker API for screenshot AND widget detection (with ISP proxy support)
    console.log('🔍 Using SCRAPELESS for screenshot and widget detection...')
    const screenshotService = getScrapelessScreenshotService()
    const result = await screenshotService.captureScreenshotWithWidgetDetection(domain)

    if (!result || !result.screenshot) {
      throw new Error('Failed to capture screenshot')
    }

    const widgetDetection = result.widgetDetection
    const screenshotBase64 = result.screenshot

    if (widgetDetection.found) {
      console.log('✅ Found accessibility widget scripts:')
      widgetDetection.scripts.forEach((widget) => {
        console.log(`   - ${widget.url} ${widget.isExactMatch ? '(exact match)' : '(contains widget.min.js)'}`)
      })
    } else {
      console.log('ℹ️  No accessibility widget scripts found on this page')
    }

    console.log('✅ Screenshot captured successfully')

    // Ensure screenshot has data URI prefix
    const screenshotDataUri = screenshotBase64.startsWith('data:') 
      ? screenshotBase64 
      : `data:image/png;base64,${screenshotBase64}`

    return {
      screenshot: screenshotDataUri,
      widgetDetection,
    }
  } catch (error) {
    // Extract detailed error information
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : 'No stack trace'
    const errorType = error?.constructor?.name || typeof error
    const errorDetails = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name,
    } : error

    console.error(`❌ Screenshot attempt ${retryCount + 1} failed:`)
    console.error(`   Error Type: ${errorType}`)
    console.error(`   Error Message: ${errorMessage}`)
    console.error(`   Error Details:`, errorDetails)
    if (errorStack && errorStack !== 'No stack trace') {
      console.error(`   Stack Trace:`, errorStack)
    }

    // Check if it's an API key issue
    if (errorMessage.includes('API') || errorMessage.includes('apiKey') || errorMessage.includes('authentication')) {
      console.error(`   ⚠️ Possible API key issue. Check SCRAPELESS_API_KEY environment variable.`)
    }

    if (retryCount < maxRetries) {
      console.log(`🔄 Retrying screenshot in ${Math.round(delay)}ms... (attempt ${retryCount + 2}/${maxRetries + 1})`)
      console.log(`📊 Retry strategy: Exponential backoff with jitter (${Math.round(delay)}ms + random jitter)`)
      await new Promise((resolve) => setTimeout(resolve, delay))
      return takeScreenshotWithWidgetDetection(domain, retryCount + 1)
    }

    console.error('⚠️ All screenshot attempts failed, continuing with accessibility scan')
    console.log(`📊 Total retry attempts: ${maxRetries + 1} (including initial attempt)`)
    return null
  }
}
// Internal function that does the actual work (without queue)
export const _fetchAccessibilityReportInternal = async (url: string, useCache?: boolean, fullSiteScan?: boolean) => {
  try {
    if (!url || typeof url !== 'string' || url.trim() === '') {
      console.error('Invalid URL passed to fetchAccessibilityReport:', url)
      throw new Error('Invalid URL provided to fetchAccessibilityReport')
    }

    try {
      // Format URL with www prefix for initial scan
      const formattedUrl = formatUrlForScan(url)
      console.log('Formatted URL for scan:', formattedUrl)

      // Run both operations in parallel
      const [accessibilityResult, ScrapelessResult] = await Promise.all([getAccessibilityInformationPally(formattedUrl, useCache, fullSiteScan), takeScreenshotWithWidgetDetection(formattedUrl)])

      let result: ResultWithOriginal = accessibilityResult

      // If initial attempt fails, try variations
      if (!result) {
        const retryUrls = getRetryUrls(url)
        for (const retryUrl of retryUrls) {
          try {
            result = await getAccessibilityInformationPally(retryUrl, useCache, fullSiteScan)
            if (result) break
          } catch (retryError) {
            console.error(`Error with retry URL ${retryUrl}:`, retryError.message)
          }
        }
      }

      // If all attempts fail, throw error
      if (!result) {
        throw new Error('Failed to fetch accessibility report for all URL variations')
      }

      if (ScrapelessResult) {
        result.siteImg = ScrapelessResult.screenshot
        // Convert widgetDetection to string format
        if (ScrapelessResult.widgetDetection.found) {
          // Check if any script is from webability.io domain
          const hasWebAbilityScript = ScrapelessResult.widgetDetection.scripts.some((script) => script.url.includes('webability.io'))
          result.scriptCheckResult = hasWebAbilityScript ? 'Web Ability' : 'true'
        } else {
          result.scriptCheckResult = 'false'
        }
      }
      if (!result.siteImg) {
        console.log('result from getAccessibilityInformationPally:', result.score, result.totalElements, result.ByFunctions)
        const siteImg = await fetchSitePreview(formattedUrl)
        if (result && siteImg) {
          result.siteImg = siteImg
        }
      }
      const scriptCheckResult = result?.scriptCheckResult ?? (await checkScript(formattedUrl))
      if (result && scriptCheckResult) {
        result.scriptCheckResult = scriptCheckResult
      }

      // Perform calculations after the block
      const issues = extractIssuesFromReport(result)
      console.log(`Extracted ${issues.length} issues from report.`)

      const issuesByFunction = groupIssuesByFunctionality(issues)
      const functionalityNames = getFunctionalityNames(issuesByFunction)

      const webabilityEnabled = scriptCheckResult === 'Web Ability'
      const totalStats = calculateTotalStats(result, issues, webabilityEnabled)

      // Add calculated fields to the result
      result.issues = issues
      result.issuesByFunction = issuesByFunction
      result.functionalityNames = functionalityNames
      result.totalStats = totalStats
      // Update result.score to match totalStats.score for consistency across PDF and UI
      result.score = totalStats.score

      if (result) {
        if (result.ByFunctions && Array.isArray(result.ByFunctions) && result.ByFunctions.length > 0) {
          const output = mergeIssuesToOutput(result.issues)
          result.axe = output.axe
          result.htmlcs = output.htmlcs
          result.totalElements = output.totalElements

          return result
        }

        const guideErrors: {
          errors: htmlcsOutput[]
          notices: htmlcsOutput[]
          warnings: htmlcsOutput[]
        } = result?._originalHtmlcs || result?.htmlcs

        const errorCodes: string[] = []
        const errorCodeWithDescriptions: { [key: string]: { [key: string]: string | string[] } } = {}

        guideErrors.errors.forEach((errorcode: htmlcsOutput) => {
          errorCodes.push(errorcode?.code)
          if (!errorCodeWithDescriptions[errorcode?.code]) {
            errorCodeWithDescriptions[errorcode?.code] = {}
          }
          errorCodeWithDescriptions[errorcode?.code].message = errorcode?.message
          errorCodeWithDescriptions[errorcode?.code].context = errorcode?.context
          errorCodeWithDescriptions[errorcode?.code].description = errorcode?.description
          errorCodeWithDescriptions[errorcode?.code].recommended_action = errorcode?.recommended_action
          errorCodeWithDescriptions[errorcode?.code].selectors = errorcode?.selectors
        })

        guideErrors.notices.forEach((errorcode: htmlcsOutput) => {
          errorCodes.push(errorcode?.code)
          if (!errorCodeWithDescriptions[errorcode?.code]) {
            errorCodeWithDescriptions[errorcode?.code] = {}
          }
          errorCodeWithDescriptions[errorcode?.code].message = errorcode?.message
          errorCodeWithDescriptions[errorcode?.code].context = errorcode?.context
          errorCodeWithDescriptions[errorcode?.code].description = errorcode?.description
          errorCodeWithDescriptions[errorcode?.code].recommended_action = errorcode?.recommended_action
          errorCodeWithDescriptions[errorcode?.code].selectors = errorcode?.selectors
        })

        guideErrors.warnings.forEach((errorcode: htmlcsOutput) => {
          errorCodes.push(errorcode?.code)
          if (!errorCodeWithDescriptions[errorcode?.code]) {
            errorCodeWithDescriptions[errorcode?.code] = {}
          }
          errorCodeWithDescriptions[errorcode?.code].message = errorcode?.message
          errorCodeWithDescriptions[errorcode?.code].context = errorcode?.context
          errorCodeWithDescriptions[errorcode?.code].description = errorcode?.description
          errorCodeWithDescriptions[errorcode?.code].recommended_action = errorcode?.recommended_action
          errorCodeWithDescriptions[errorcode?.code].selectors = errorcode?.selectors
        })

        const completion: GPTData = await GPTChunks(errorCodes)

        if (completion) {
          completion.HumanFunctionalities.forEach((functionality: HumanFunctionality) => {
            functionality.Errors.forEach((error: Error) => {
              let errorCode = error.ErrorGuideline || (error as any)['Error Guideline'] || (error as any).code || (error as any)['Error Code'] || (error as any).guideline

              if (!errorCode) {
                const possibleCode = Object.values(error).find((value: any) => typeof value === 'string' && value.includes('WCAG'))
                errorCode = possibleCode
              }

              error.code = errorCode
              delete error.ErrorGuideline
              delete (error as any)['Error Guideline']

              if (errorCode && errorCodeWithDescriptions[errorCode]) {
                error.description = errorCodeWithDescriptions[errorCode]?.description
                error.context = errorCodeWithDescriptions[errorCode]?.context
                error.message = errorCodeWithDescriptions[errorCode]?.message
                error.recommended_action = errorCodeWithDescriptions[errorCode]?.recommended_action
                error.selectors = errorCodeWithDescriptions[errorCode]?.selectors
              } else {
                let enhancedDescription = null
                if (result?.htmlcs?.errors) {
                  const enhancedError = result.htmlcs.errors.find((e: any) => e.code === errorCode)
                  if (enhancedError) {
                    enhancedDescription = enhancedError.description
                    error.message = enhancedError.message
                    error.recommended_action = enhancedError.recommended_action
                    error.context = enhancedError.context || []
                    error.selectors = enhancedError.selectors || []
                  }
                }

                error.description = enhancedDescription || 'Accessibility issue detected. Please review this element for compliance.'
                error.message = error.message || 'Accessibility compliance issue'
                error.recommended_action = error.recommended_action || 'Review and fix this accessibility issue according to WCAG guidelines.'
                error.context = error.context || []
                error.selectors = error.selectors || []
              }
            })
          })

          result.ByFunctions = completion.HumanFunctionalities
        }
      }
      const output = mergeIssuesToOutput(result.issues)
      result.axe = output.axe
      result.htmlcs = output.htmlcs
      result.totalElements = output.totalElements

      return result
    } catch (error) {
      console.error(`Error with https://www.: ${error.message}`)
      try {
        if (!url.startsWith('https://') && !url.startsWith('http://')) {
          url = `https://${url.replace('https://www.', '').replace('http://www.', '')}`
        }

        const result: ResultWithOriginal = await getAccessibilityInformationPally(url, useCache, fullSiteScan)
        const output = mergeIssuesToOutput(result.issues)
        result.axe = output.axe
        result.htmlcs = output.htmlcs
        result.totalElements = output.totalElements

        return result
      } catch (retryError) {
        console.error(`Error with https:// retry: ${retryError.message}`)
        throw new Error(`Both attempts failed: ${retryError.message}`)
      }
    }
  } catch (error) {
    console.error(error)
    throw new Error(`${error} Error fetching data from WebAIM API`)
  }
}

export const fetchAccessibilityReport = async (options: { url: string; useCache?: boolean; fullSiteScan?: boolean; priority?: number }) => {
  try {
    const result = await accessibilityReportQueue.addTask(options)
    return result
  } catch (error) {
    throw error
  }
}

export const fetchSitePreview = async (url: string, retries = 3): Promise<string | null> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const apiUrl = `${process.env.SECONDARY_SERVER_URL}/screenshot/?url=${url}`
      console.log(`Attempt ${attempt}: Fetching screenshot from: ${apiUrl}`)

      // Set up timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      const response = await fetch(apiUrl, {
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        console.error(`Failed to fetch screenshot for ${url}. Status: ${response.status}`)
        if (attempt === retries) return null
        // Wait before retrying (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000))
        continue
      }

      const buffer = await response.arrayBuffer()
      const base64Image = Buffer.from(buffer).toString('base64')
      return `data:image/png;base64,${base64Image}`
    } catch (error) {
      console.error(`Error generating screenshot for ${url} (attempt ${attempt}):`, error)
      if (attempt === retries) return null
      // Wait before retrying (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000))
    }
  }
  return null
}

const checkScript = async (url: string, retries = 3): Promise<string> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const apiUrl = `${process.env.SECONDARY_SERVER_URL}/checkscript/?url=${url}`

      // Set up timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      const response = await fetch(apiUrl, {
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        console.error(`Failed to fetch script check on attempt ${attempt}. Status: ${response.status}`)
        if (attempt === retries) throw new Error(`Failed to fetch the script check. Status: ${response.status}`)
        // Wait before retrying (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000))
        continue
      }

      const responseData = await response.json()

      if ((responseData as any).result === 'WebAbility') {
        return 'Web Ability'
      }
      if ((responseData as any).result !== 'Not Found') {
        return 'true'
      }
      return 'false'
    } catch (error) {
      console.error(`Error in checkScript attempt ${attempt}:`, error.message)
      if (attempt === retries) return 'Error'
      // Wait before retrying (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000))
    }
  }
  return 'Error'
}

// Extract issues from report structure
function extractIssuesFromReport(report: ResultWithOriginal) {
  const issues: any[] = []

  // Check if we have the new data structure with top-level ByFunctions
  if (report?.ByFunctions && Array.isArray(report.ByFunctions)) {
    report.ByFunctions.forEach((funcGroup) => {
      if (funcGroup.FunctionalityName && Array.isArray(funcGroup.Errors)) {
        funcGroup.Errors.forEach((error: { message: string; code: any; __typename: string; screenshotUrl?: string; pages_affected?: string[] }) => {
          const impact = mapIssueToImpact(error.message, error.code)

          issues.push({
            ...error,
            impact,
            source: error.__typename === 'htmlCsOutput' ? 'HTML_CS' : 'AXE Core',
            functionality: funcGroup.FunctionalityName,
            screenshotUrl: error.screenshotUrl,
            pages_affected: error.pages_affected,
          })
          if (error.screenshotUrl) {
            console.log('[extractIssuesFromReport][ByFunctions] screenshotUrl:', error.screenshotUrl, 'message:', error.message)
          }
        })
      }
    })
  }

  // Try the axe structure
  if (report?.axe?.ByFunction && Array.isArray(report.axe.ByFunction)) {
    report.axe.ByFunction.forEach((funcGroup: { FunctionalityName: any; Errors: any[] }) => {
      if (funcGroup.FunctionalityName && Array.isArray(funcGroup.Errors)) {
        funcGroup.Errors.forEach((error) => {
          const impact = mapIssueToImpact(error.message, error.code)

          issues.push({
            ...error,
            impact,
            source: 'AXE Core',
            functionality: funcGroup.FunctionalityName,
            screenshotUrl: error.screenshotUrl,
            pages_affected: error.pages_affected,
          })
          if (error.screenshotUrl) {
            console.log('[extractIssuesFromReport][AXE] screenshotUrl:', error.screenshotUrl, 'message:', error.message)
          }
        })
      }
    })
  }

  // Try the htmlcs structure
  if (report?.htmlcs?.ByFunction && Array.isArray(report.htmlcs.ByFunction)) {
    report.htmlcs.ByFunction.forEach((funcGroup: { FunctionalityName: any; Errors: any[] }) => {
      if (funcGroup.FunctionalityName && Array.isArray(funcGroup.Errors)) {
        funcGroup.Errors.forEach((error: { message: string; code: any; __typename: string; screenshotUrl?: string; pages_affected?: string[] }) => {
          const impact = mapIssueToImpact(error.message, error.code)

          issues.push({
            ...error,
            impact,
            source: 'HTML_CS',
            functionality: funcGroup.FunctionalityName,
            screenshotUrl: error.screenshotUrl,
            pages_affected: error.pages_affected,
          })
          if (error.screenshotUrl) {
            console.log('[extractIssuesFromReport][HTMLCS] screenshotUrl:', error.screenshotUrl, 'message:', error.message)
          }
        })
      }
    })
  }
  console.log(`Total issues extracted: ${issues.length}`)
  return issues
}

function mapIssueToImpact(message: string, code: any) {
  if (!message && !code) return 'moderate'

  const lowerMsg = (message || '').toLowerCase()
  const lowerCode = (code || '').toLowerCase()

  // Critical issues
  if (lowerMsg.includes('color contrast') || lowerMsg.includes('minimum contrast') || lowerCode.includes('1.4.3') || (lowerMsg.includes('aria hidden') && lowerMsg.includes('focusable')) || lowerMsg.includes('links must be distinguishable')) {
    return 'critical'
  }

  // Serious issues
  if (lowerMsg.includes('aria attributes') || lowerMsg.includes('permitted aria') || lowerMsg.includes('labels or instructions') || lowerMsg.includes('error identification')) {
    return 'serious'
  }

  return 'moderate'
}

// Count issues by severity
function countIssuesBySeverity(issues: any[]) {
  // Count issues by impact
  const counts = {
    criticalIssues: 0,
    warnings: 0,
    moderateIssues: 0,
    totalIssues: issues.length,
  }

  // Count each issue by its impact
  issues.forEach((issue) => {
    if (issue.impact === 'critical') {
      counts.criticalIssues++
    } else if (issue.impact === 'serious') {
      counts.warnings++
    } else {
      counts.moderateIssues++
    }
  })

  return counts
}

function groupIssuesByFunctionality(issues: any[]): { [key: string]: any[] } {
  const groupedIssues: { [key: string]: any[] } = {}

  issues.forEach((issue: { functionality: string; screenshotUrl?: string; pages_affected?: string[] }) => {
    if (issue.functionality) {
      // Normalize functionality name to prevent duplicates like "Low Vision" and "Low vision"
      const normalizedName = issue.functionality
        .split(' ')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')

      if (!groupedIssues[normalizedName]) {
        groupedIssues[normalizedName] = []
      }

      // Store the issue with the normalized functionality name
      const normalizedIssue = {
        ...issue,
        functionality: normalizedName,
        screenshotUrl: issue.screenshotUrl,
        pages_affected: issue.pages_affected,
      }

      groupedIssues[normalizedName].push(normalizedIssue)
    }
  })

  return groupedIssues
}

function getFunctionalityNames(issuesByFunction: { [key: string]: any[] }): string[] {
  return Object.keys(issuesByFunction).sort()
}

function calculateTotalStats(
  report: any,
  issues: any[],
  webabilityEnabled: boolean,
): {
  score: number
  originalScore: number
  criticalIssues: number
  warnings: number
  moderateIssues: number
  totalElements: number
  hasWebAbility: boolean
} {
  const severityCounts = countIssuesBySeverity(issues)
  const baseScore = report?.score || 0
  console.log(`Base score: ${baseScore}, Critical: ${severityCounts.criticalIssues}, Warnings: ${severityCounts.warnings}, Moderate: ${severityCounts.moderateIssues}`)
  
  // If no issues are detected (displayed to user), set score to 95
  let enhancedScore
  if (issues.length === 0) {
    enhancedScore = 95
    console.log('No issues found - setting score to 95%')
  } else {
    enhancedScore = webabilityEnabled ? Math.min(95, baseScore + 45) : baseScore
  }

  return {
    score: enhancedScore,
    originalScore: baseScore,
    criticalIssues: severityCounts.criticalIssues,
    warnings: severityCounts.warnings,
    moderateIssues: severityCounts.moderateIssues,
    totalElements: report?.totalElements || 0,
    hasWebAbility: webabilityEnabled,
  }
}
