import { Scrapeless } from '@scrapeless-ai/sdk'
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

/**
 * ISP Proxy Configuration
 */
interface ISPProxy {
  ip: string
  port: number
  username: string
  password: string
  country: string
}

/**
 * Load ISP proxies from environment variables
 */
function loadISPProxiesFromEnv(): Map<string, ISPProxy> {
  const proxies = new Map<string, ISPProxy>()

  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith('ISP_PROXY_')) {
      const country = key.replace('ISP_PROXY_', '').toUpperCase()
      const parts = value?.split(':')

      if (parts && parts.length === 4) {
        const [ip, port, username, password] = parts
        const portNum = parseInt(port, 10)

        if (!isNaN(portNum) && ip && username && password) {
          proxies.set(country, {
            ip,
            port: portNum,
            username,
            password,
            country,
          })
        }
      }
    }
  }

  return proxies
}

/**
 * Determine preferred country based on URL TLD
 */
function getPreferredCountryFromURL(url: string): string {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()

    // Check for .de domain
    if (hostname.endsWith('.de') || hostname.includes('.de.')) {
      return 'DE'
    }

    // Check for US domains
    if (
      hostname.endsWith('.com') ||
      hostname.endsWith('.org') ||
      hostname.endsWith('.net') ||
      hostname.endsWith('.us') ||
      hostname.endsWith('.edu') ||
      hostname.endsWith('.gov') ||
      hostname.endsWith('.io')
    ) {
      return 'US'
    }

    // Default to US
    return 'US'
  } catch {
    return 'US'
  }
}

/**
 * Generate ISP proxy URL
 */
function generateISPProxyURL(proxy: ISPProxy): string {
  // Handle IPv6 addresses
  const isIPv6 = proxy.ip.includes(':')
  const host = isIPv6 ? `[${proxy.ip}]` : proxy.ip
  return `http://${proxy.username}:${proxy.password}@${host}:${proxy.port}`
}

/**
 * Normalize and validate URL
 */
function normalizeURL(url: string): string {
  if (!url) {
    throw new Error('URL is required')
  }

  // Remove whitespace
  url = url.trim()

  // Add protocol if missing
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`
  }

  // Validate URL format
  try {
    const urlObj = new URL(url)
    return urlObj.toString()
  } catch (error) {
    throw new Error(`Invalid URL format: ${url}`)
  }
}

export class BrowserbaseService {
  private apiKey: string
  private client: Scrapeless
  private ispProxies: Map<string, ISPProxy>

  constructor() {
    this.apiKey = process.env.SCRAPELESS_API_KEY || ''

    if (!this.apiKey) {
      console.error('[SCRAPELESS] No API key found in environment variables')
      throw new Error('SCRAPELESS_API_KEY environment variable is required')
    }

    // Initialize SCRAPELESS client
    this.client = new Scrapeless({
      apiKey: this.apiKey,
    })

    // Load ISP proxies
    this.ispProxies = loadISPProxiesFromEnv()
    
    if (this.ispProxies.size > 0) {
      console.log(`[SCRAPELESS] Loaded ${this.ispProxies.size} ISP proxies: [${Array.from(this.ispProxies.keys()).join(', ')}]`)
    }
  }

  async scrapeUrl(url: string): Promise<ScrapeResult> {
    // Normalize URL first
    const normalizedUrl = normalizeURL(url)
    const preferredCountry = getPreferredCountryFromURL(normalizedUrl)
    const hasISPForPreferred = this.ispProxies.has(preferredCountry)

    // Try with ISP proxy first, then residential, then default
    let browser: any = null
    let lastError: Error | null = null

    // Strategy 1: Try preferred country (ISP or residential)
    if (hasISPForPreferred || preferredCountry) {
      try {
        console.log(`[SCRAPELESS] Trying with ${hasISPForPreferred ? `ISP (${preferredCountry})` : `residential (${preferredCountry})`} proxy...`)
        return await this.scrapeWithProxy(normalizedUrl, hasISPForPreferred, hasISPForPreferred ? null : preferredCountry, hasISPForPreferred ? this.ispProxies.get(preferredCountry) : undefined)
      } catch (error: any) {
        const errorMsg = error?.message || ''
        if (errorMsg.includes('Insufficient balance')) {
          throw error
        }
        lastError = error
        console.warn(`[SCRAPELESS] ${hasISPForPreferred ? `ISP (${preferredCountry})` : `Residential (${preferredCountry})`} attempt failed, falling back...`)
      }
    }

    // Strategy 2: If DE failed, try US ISP proxy
    if (preferredCountry === 'DE' && this.ispProxies.has('US')) {
      try {
        console.log('[SCRAPELESS] Trying with ISP (US) fallback...')
        return await this.scrapeWithProxy(normalizedUrl, true, null, this.ispProxies.get('US'))
      } catch (error: any) {
        const errorMsg = error?.message || ''
        if (errorMsg.includes('Insufficient balance')) {
          throw error
        }
        lastError = error
        console.warn('[SCRAPELESS] ISP (US) attempt failed, falling back...')
      }
    }

    // Strategy 3: Fallback to default (no proxy)
    try {
      console.log('[SCRAPELESS] Trying with default (no proxy)...')
      return await this.scrapeWithProxy(normalizedUrl, false, null)
    } catch (error: any) {
      const errorMsg = error?.message || ''
      if (errorMsg.includes('Insufficient balance')) {
        throw error
      }
      lastError = error
      console.error('[SCRAPELESS] All proxy strategies failed')
      throw lastError || error
    }
  }

  private async scrapeWithProxy(
    url: string,
    useISPProxy: boolean,
    proxyCountry: string | null,
    ispProxy?: ISPProxy,
  ): Promise<ScrapeResult> {
    let browser: any = null

    try {
      if (!this.apiKey || this.apiKey.trim() === '') {
        throw new Error('SCRAPELESS_API_KEY is not set or is empty')
      }

      // Build proxy configuration
      const proxyConfig: any = {}
      if (useISPProxy && ispProxy) {
        proxyConfig.url = generateISPProxyURL(ispProxy)
        console.log(`[SCRAPELESS] Using ISP proxy for ${ispProxy.country}`)
      } else if (proxyCountry) {
        proxyConfig.country = proxyCountry
        console.log(`[SCRAPELESS] Using residential proxy for country: ${proxyCountry}`)
      }

      // Create a browser session with SCRAPELESS
      const { browserWSEndpoint } = await this.client.browser.create({
        sessionName: `scrape-${Date.now()}`,
        sessionTTL: 300, // 5 minutes
        ...proxyConfig, // Include proxy configuration
      })

      // Connect to the browser using Puppeteer
      browser = await puppeteer.connect({
        browserWSEndpoint: browserWSEndpoint,
      })

      let page
      try {
        page = await browser.newPage()
      } catch (pageError) {
        console.error(`[SCRAPELESS] Failed to create new page:`, pageError)
        throw new Error(`Failed to create new page: ${pageError instanceof Error ? pageError.message : String(pageError)}`)
      }

      // Set viewport and user agent
      try {
        await page.setViewport({ width: 1920, height: 1080 })
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')
      } catch (configError) {
        console.error(`[SCRAPELESS] Failed to configure page:`, configError)
        throw new Error(`Failed to configure page: ${configError instanceof Error ? configError.message : String(configError)}`)
      }

      // Navigate to the URL
      let response
      try {
        response = await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 60000, // 60 seconds
        })
      } catch (navError) {
        console.error(`[SCRAPELESS] Navigation failed:`, navError)
        throw new Error(`Failed to navigate to URL: ${navError instanceof Error ? navError.message : String(navError)}`)
      }

      if (!response) {
        throw new Error('Failed to navigate to URL - no response received')
      }

      // Wait a bit for any dynamic content to load
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Get the rendered HTML content
      const html = await page.content()

      if (!html || html.length < 100) {
        console.error('[SCRAPELESS] No HTML content found')
        console.error('[SCRAPELESS] Response preview:', html ? html.substring(0, 200) : 'null or undefined')
        throw new Error('No HTML content found in response')
      }

      // Extract metadata using Puppeteer
      const title = await page.title()
      const description = await page.$eval('meta[name="description"]', (el: any) => el.getAttribute('content')).catch(() => '')

      // Close the page and browser
      await page.close()
      await browser.close()

      console.log(`[SCRAPELESS] Successfully scraped ${url} using ${useISPProxy && ispProxy ? `ISP (${ispProxy.country})` : proxyCountry ? `residential (${proxyCountry})` : 'default'} proxy`)

      const result = {
        html,
        metadata: {
          title,
          description: description || undefined,
          url,
          statusCode: response.status(),
        },
      }

      return result
    } catch (error) {
      // Clean up browser if it was created
      if (browser) {
        try {
          await browser.close()
        } catch (cleanupError) {
          console.warn(`[SCRAPELESS] Failed to cleanup browser: ${cleanupError}`)
        }
      }

      // Re-throw error to be handled by fallback strategy
      throw error
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
      //  console.log(`[SCRAPELESS] Starting markdown scrape for: ${url}`)
      const result = await this.scrapeUrl(url)
      const html = result.html

      //  console.log(`[SCRAPELESS] Converting HTML to markdown, HTML length: ${html.length}`)

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

      // console.log(`[SCRAPELESS] Markdown conversion completed, markdown length: ${markdown.length}`)
      // console.log(`[SCRAPELESS] Markdown preview (first 200 chars):`, markdown.substring(0, 200))

      return markdown
    } catch (error) {
      console.error('SCRAPELESS markdown scrape error:', error)
      throw new Error(`Failed to scrape markdown: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async checkFileExists(url: string): Promise<{ exists: boolean; content?: string; statusCode?: number }> {
    try {
      //    console.log(`[SCRAPELESS] Checking if file exists: ${url}`)
      const result = await this.scrapeUrl(url)
      const exists = result.metadata.statusCode === 200

      // console.log(`[SCRAPELESS] File check result:`, {
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
      //  console.log(`[SCRAPELESS] File check failed for ${url}:`, error)
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
    //  console.log('[SCRAPELESS] Creating new service instance...')
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
