import { Browserbase } from '@browserbasehq/sdk'
import puppeteer from 'puppeteer-core'

export interface ScrapeResult {
  html: string
  metadata: {
    title?: string
    description?: string
    url?: string
    statusCode?: number
  }
}

export class BrowserbaseService {
  private apiKey: string
  private projectId: string
  private browserbase: Browserbase

  constructor() {
    this.apiKey = process.env.BROWSERBASE_API_KEY || ''
    this.projectId = process.env.BROWSERBASE_PROJECT_ID || ''
    // console.log('[BROWSERBASE] Initializing service...')
    // console.log('[BROWSERBASE] API Key found:', !!this.apiKey)
    // console.log('[BROWSERBASE] Project ID found:', !!this.projectId)
    // console.log('[BROWSERBASE] API Key preview:', this.apiKey ? this.apiKey.substring(0, 10) + '...' : 'No API key')
    // console.log('[BROWSERBASE] Project ID:', this.projectId)

    if (!this.apiKey) {
      console.error('[BROWSERBASE] No API key found in environment variables')
      throw new Error('BROWSERBASE_API_KEY environment variable is required')
    }
    if (!this.projectId) {
      console.error('[BROWSERBASE] No project ID found in environment variables')
      throw new Error('BROWSERBASE_PROJECT_ID environment variable is required')
    }

    // Initialize Browserbase SDK
    this.browserbase = new Browserbase({
      apiKey: this.apiKey,
    })

    //  console.log('[BROWSERBASE] Service initialized successfully with SDK')
  }

  async scrapeUrl(url: string): Promise<ScrapeResult> {
    let sessionId: string | null = null

    try {
      // console.log(`[BROWSERBASE] Scraping URL: ${url}`)
      // console.log(`[BROWSERBASE] Using API key: ${this.apiKey.substring(0, 10)}...`)

      // Create a new session
      //  console.log(`[BROWSERBASE] Creating new session...`)
      const session = await this.browserbase.sessions.create({
        projectId: this.projectId,
      })

      sessionId = session.id
      // console.log(`[BROWSERBASE] Session created: ${sessionId}`)
      // console.log(`[BROWSERBASE] Session object:`, JSON.stringify(session, null, 2))

      // Check for various possible WebSocket endpoint properties
      const sessionAny = session as any
      let wsEndpoint = sessionAny.webSocketDebuggerUrl || sessionAny.browserWSEndpoint || sessionAny.wsUrl || sessionAny.websocketUrl || sessionAny.browserUrl || sessionAny.endpoint

      // If no direct WebSocket endpoint, try to construct it from connectUrl
      if (!wsEndpoint && sessionAny.connectUrl) {
        const connectUrl = sessionAny.connectUrl
        // console.log(`[BROWSERBASE] Found connectUrl: ${connectUrl}`)
        // console.log(`[BROWSERBASE] connectUrl type:`, typeof connectUrl)

        // Try different approaches to construct the WebSocket endpoint
        if (connectUrl && typeof connectUrl === 'string') {
          if (connectUrl.startsWith('wss://')) {
            // Approach 1: Direct use of connectUrl
            wsEndpoint = connectUrl
            //  console.log(`[BROWSERBASE] Using connectUrl directly as WebSocket endpoint: ${wsEndpoint}`)
          } else if (connectUrl.startsWith('ws://')) {
            // Approach 2: Convert ws:// to wss://
            wsEndpoint = connectUrl.replace('ws://', 'wss://')
            //  console.log(`[BROWSERBASE] Converted ws:// to wss://: ${wsEndpoint}`)
          } else {
            // Approach 3: Try to construct from session ID
            const sessionIdFromUrl = connectUrl.split('/').pop()
            wsEndpoint = `wss://connect.browserbase.com/sessions/${sessionIdFromUrl}`
            // console.log(`[BROWSERBASE] Constructed WebSocket endpoint from session ID: ${wsEndpoint}`)
          }
        }
      }

      // console.log(`[BROWSERBASE] Available session properties:`, Object.keys(session))
      // console.log(`[BROWSERBASE] WebSocket endpoint found: ${wsEndpoint}`)

      let finalWsEndpoint = wsEndpoint

      if (!wsEndpoint) {
        console.error(`[BROWSERBASE] No WebSocket endpoint found. Available properties:`, Object.keys(session))
        //  console.log(`[BROWSERBASE] Full session object:`, session)

        // Try to get the session details again after a short wait
        //  console.log(`[BROWSERBASE] Waiting for session to be ready...`)
        await new Promise((resolve) => setTimeout(resolve, 3000))

        try {
          const sessionDetails = await this.browserbase.sessions.retrieve(sessionId)
          //   console.log(`[BROWSERBASE] Session details after wait:`, JSON.stringify(sessionDetails, null, 2))

          const sessionDetailsAny = sessionDetails as any
          let wsEndpointRetry = sessionDetailsAny.webSocketDebuggerUrl || sessionDetailsAny.browserWSEndpoint || sessionDetailsAny.wsUrl || sessionDetailsAny.websocketUrl || sessionDetailsAny.browserUrl || sessionDetailsAny.endpoint

          // If no direct WebSocket endpoint, try to construct it from connectUrl
          if (!wsEndpointRetry && sessionDetailsAny.connectUrl) {
            const connectUrl = sessionDetailsAny.connectUrl
            //   console.log(`[BROWSERBASE] Found connectUrl in retry: ${connectUrl}`)

            if (connectUrl && typeof connectUrl === 'string') {
              if (connectUrl.startsWith('wss://')) {
                wsEndpointRetry = connectUrl
                //   console.log(`[BROWSERBASE] Using connectUrl directly in retry: ${wsEndpointRetry}`)
              } else if (connectUrl.startsWith('ws://')) {
                wsEndpointRetry = connectUrl.replace('ws://', 'wss://')
                //   console.log(`[BROWSERBASE] Converted ws:// to wss:// in retry: ${wsEndpointRetry}`)
              } else {
                const sessionIdFromUrl = connectUrl.split('/').pop()
                wsEndpointRetry = `wss://connect.browserbase.com/sessions/${sessionIdFromUrl}`
                //  console.log(`[BROWSERBASE] Constructed WebSocket endpoint in retry: ${wsEndpointRetry}`)
              }
            }
          }

          if (wsEndpointRetry) {
            //   console.log(`[BROWSERBASE] WebSocket endpoint found after retry: ${wsEndpointRetry}`)
            finalWsEndpoint = wsEndpointRetry
          } else {
            throw new Error('No WebSocket endpoint found even after retry. Available properties: ' + Object.keys(sessionDetails).join(', '))
          }
        } catch (retryError) {
          console.error(`[BROWSERBASE] Retry failed:`, retryError)

          // Final fallback: try to get session details via REST API
          //  console.log(`[BROWSERBASE] Trying REST API fallback to get session details...`)
          try {
            const restResponse = await fetch(`https://api.browserbase.com/v1/sessions/${sessionId}`, {
              method: 'GET',
              headers: {
                'x-bb-api-key': this.apiKey,
              },
            })

            if (restResponse.ok) {
              const restSessionData = await restResponse.json()
              //   console.log(`[BROWSERBASE] REST API session data:`, JSON.stringify(restSessionData, null, 2))

              const restSessionDataAny = restSessionData as any
              let restWsEndpoint = restSessionDataAny.webSocketDebuggerUrl || restSessionDataAny.browserWSEndpoint || restSessionDataAny.wsUrl || restSessionDataAny.websocketUrl || restSessionDataAny.browserUrl || restSessionDataAny.endpoint

              // If no direct WebSocket endpoint, try to construct it from connectUrl
              if (!restWsEndpoint && restSessionDataAny.connectUrl) {
                const connectUrl = restSessionDataAny.connectUrl
                //  console.log(`[BROWSERBASE] Found connectUrl in REST API: ${connectUrl}`)

                if (connectUrl && typeof connectUrl === 'string') {
                  if (connectUrl.startsWith('wss://')) {
                    restWsEndpoint = connectUrl
                    //    console.log(`[BROWSERBASE] Using connectUrl directly via REST API: ${restWsEndpoint}`)
                  } else if (connectUrl.startsWith('ws://')) {
                    restWsEndpoint = connectUrl.replace('ws://', 'wss://')
                    //   console.log(`[BROWSERBASE] Converted ws:// to wss:// via REST API: ${restWsEndpoint}`)
                  } else {
                    const sessionIdFromUrl = connectUrl.split('/').pop()
                    restWsEndpoint = `wss://connect.browserbase.com/sessions/${sessionIdFromUrl}`
                    //  console.log(`[BROWSERBASE] Constructed WebSocket endpoint via REST API: ${restWsEndpoint}`)
                  }
                }
              }

              if (restWsEndpoint) {
                //  console.log(`[BROWSERBASE] WebSocket endpoint found via REST API: ${restWsEndpoint}`)
                finalWsEndpoint = restWsEndpoint
              } else {
                throw new Error('No WebSocket endpoint found via REST API either. Available properties: ' + Object.keys(restSessionData).join(', '))
              }
            } else {
              throw new Error(`REST API failed: ${restResponse.status} - ${await restResponse.text()}`)
            }
          } catch (restError) {
            throw new Error('No WebSocket endpoint found in session response. Available properties: ' + Object.keys(session).join(', ') + '. Retry error: ' + retryError + '. REST API error: ' + restError)
          }
        }
      }

      // Connect Puppeteer to the session
      // console.log(`[BROWSERBASE] Connecting Puppeteer to session...`)
      // console.log(`[BROWSERBASE] Using WebSocket endpoint: ${finalWsEndpoint}`)

      let browser
      try {
        browser = await puppeteer.connect({
          browserWSEndpoint: finalWsEndpoint,
        })
        //  console.log(`[BROWSERBASE] Successfully connected to browser via Puppeteer`)
      } catch (puppeteerError) {
        console.error(`[BROWSERBASE] Puppeteer connection failed:`, puppeteerError)
        console.error(`[BROWSERBASE] Puppeteer error type:`, typeof puppeteerError)
        console.error(`[BROWSERBASE] Puppeteer error details:`, JSON.stringify(puppeteerError, null, 2))

        const errorMessage = puppeteerError instanceof Error ? puppeteerError.message : typeof puppeteerError === 'object' ? JSON.stringify(puppeteerError) : String(puppeteerError)

        throw new Error(`Failed to connect to browser via Puppeteer: ${errorMessage}`)
      }

      let page
      try {
        page = await browser.newPage()
        // console.log(`[BROWSERBASE] Successfully created new page`)
      } catch (pageError) {
        console.error(`[BROWSERBASE] Failed to create new page:`, pageError)
        throw new Error(`Failed to create new page: ${pageError instanceof Error ? pageError.message : String(pageError)}`)
      }

      // Set viewport and user agent
      try {
        await page.setViewport({ width: 1920, height: 1080 })
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')
        // console.log(`[BROWSERBASE] Successfully set viewport and user agent`)
      } catch (configError) {
        console.error(`[BROWSERBASE] Failed to configure page:`, configError)
        throw new Error(`Failed to configure page: ${configError instanceof Error ? configError.message : String(configError)}`)
      }

      // Navigate to the URL
      // console.log(`[BROWSERBASE] Navigating to: ${url}`)
      let response
      try {
        response = await page.goto(url, {
          waitUntil: 'domcontentloaded', // Changed from 'networkidle2' to 'domcontentloaded'
          timeout: 60000, // Increased from 30000 to 60000 (60 seconds)
        })
        //  console.log(`[BROWSERBASE] Navigation completed`)
      } catch (navError) {
        console.error(`[BROWSERBASE] Navigation failed:`, navError)
        throw new Error(`Failed to navigate to URL: ${navError instanceof Error ? navError.message : String(navError)}`)
      }

      if (!response) {
        throw new Error('Failed to navigate to URL - no response received')
      }

      //console.log(`[BROWSERBASE] Navigation successful, status: ${response.status()}`)

      // Wait a bit for any dynamic content to load
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Get the rendered HTML content
      //console.log(`[BROWSERBASE] Extracting HTML content...`)
      const html = await page.content()
      //console.log(`[BROWSERBASE] HTML content length: ${html.length}`)

      if (!html || html.length < 100) {
        console.error('[BROWSERBASE] No HTML content found')
        console.error('[BROWSERBASE] Response preview:', html.substring(0, 200))
        throw new Error('No HTML content found in response')
      }

      // Extract metadata using Puppeteer
      const title = await page.title()
      const description = await page.$eval('meta[name="description"]', (el) => el.getAttribute('content')).catch(() => '')

      // console.log(`[BROWSERBASE] Successfully scraped ${url} using Browserbase SDK`)
      //console.log(`[BROWSERBASE] Page title: "${title}"`)
      //console.log(`[BROWSERBASE] Page description: "${description}"`)

      // Close the page and browser
      await page.close()
      await browser.close()

      // Update session status to release it
      // console.log(`[BROWSERBASE] Releasing session...`)
      await this.browserbase.sessions.update(sessionId, {
        projectId: this.projectId,
        status: 'REQUEST_RELEASE',
      })

      const result = {
        html,
        metadata: {
          title,
          description: description || undefined,
          url,
          statusCode: response.status(),
        },
      }

      // console.log(`[BROWSERBASE] Final result:`, {
      //   htmlLength: result.html.length,
      //   metadata: result.metadata,
      //   hasTitle: !!result.metadata.title,
      //   hasDescription: !!result.metadata.description,
      // })

      return result
    } catch (error) {
      console.error('Browserbase scrape error:', error)
      console.error('Error type:', typeof error)
      console.error('Error constructor:', error?.constructor?.name)
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')

      // Clean up session if it was created
      if (sessionId) {
        try {
          //   console.log(`[BROWSERBASE] Cleaning up session: ${sessionId}`)
          // Note: Session cleanup is handled by the session.close() call above
        } catch (cleanupError) {
          console.warn(`[BROWSERBASE] Failed to cleanup session: ${cleanupError}`)
        }
      }

      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorDetails = error instanceof Error ? error.stack : 'No stack trace available'

      throw new Error(`Failed to scrape website: ${errorMessage}. Details: ${errorDetails}`)
    }
  }

  private extractTitle(html: string): string {
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i)
    return titleMatch ? titleMatch[1].trim() : ''
  }

  private extractDescription(html: string): string {
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)
    return descMatch ? descMatch[1].trim() : ''
  }

  async scrapeMarkdown(url: string): Promise<string> {
    try {
      //  console.log(`[BROWSERBASE] Starting markdown scrape for: ${url}`)
      const result = await this.scrapeUrl(url)
      const html = result.html

      //  console.log(`[BROWSERBASE] Converting HTML to markdown, HTML length: ${html.length}`)

      // Simple HTML to markdown conversion
      const markdown = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
        .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
        .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
        .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
        .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
        .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
        .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
        .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
        .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
        .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
        .replace(/<ul[^>]*>(.*?)<\/ul>/gi, '$1')
        .replace(/<ol[^>]*>(.*?)<\/ol>/gi, '$1')
        .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
        .replace(/<[^>]+>/g, '')
        .replace(/\n\s*\n\s*\n/g, '\n\n')
        .trim()

      // console.log(`[BROWSERBASE] Markdown conversion completed, markdown length: ${markdown.length}`)
      // console.log(`[BROWSERBASE] Markdown preview (first 200 chars):`, markdown.substring(0, 200))

      return markdown
    } catch (error) {
      console.error('Browserbase markdown scrape error:', error)
      throw new Error(`Failed to scrape markdown: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async checkFileExists(url: string): Promise<{ exists: boolean; content?: string; statusCode?: number }> {
    try {
      //    console.log(`[BROWSERBASE] Checking if file exists: ${url}`)
      const result = await this.scrapeUrl(url)
      const exists = result.metadata.statusCode === 200

      // console.log(`[BROWSERBASE] File check result:`, {
      //   url,
      //   exists,
      //   statusCode: result.metadata.statusCode,
      //   contentLength: result.html.length,
      // })

      return {
        exists,
        content: result.html,
        statusCode: result.metadata.statusCode,
      }
    } catch (error) {
      //  console.log(`[BROWSERBASE] File check failed for ${url}:`, error)
      return {
        exists: false,
        statusCode: 404,
      }
    }
  }
}

// Export a function that creates the service instance
let serviceInstance: BrowserbaseService | null = null

export function getBrowserbaseService(): BrowserbaseService {
  if (!serviceInstance) {
    //  console.log('[BROWSERBASE] Creating new service instance...')
    serviceInstance = new BrowserbaseService()
  }
  return serviceInstance
}

// For backward compatibility, also export the service instance
export const browserbaseService = getBrowserbaseService()

// Legacy exports for backward compatibility
export const browserlessService = getBrowserbaseService()
export function getBrowserlessService(): BrowserbaseService {
  return getBrowserbaseService()
}
