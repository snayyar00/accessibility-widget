import fs from 'fs'
import { URL } from 'url'

interface ISPProxy {
  ip: string
  port: number
  username: string
  password: string
  country: string
}

// Loads ISP proxy configurations from environment variables (ISP_PROXY_*)
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

// Determines preferred proxy country (DE or US) based on URL TLD
function getPreferredCountryFromURL(url: string): string {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()

    if (hostname.endsWith('.de') || hostname.includes('.de.')) {
      return 'DE'
    }

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

    return 'US'
  } catch {
    return 'US'
  }
}

// Generates HTTP proxy URL string from ISP proxy configuration
function generateISPProxyURL(proxy: ISPProxy): string {
  const isIPv6 = proxy.ip.includes(':')
  const host = isIPv6 ? `[${proxy.ip}]` : proxy.ip
  return `http://${proxy.username}:${proxy.password}@${host}:${proxy.port}`
}
export class ScrapelessScreenshotService {
  private apiKey: string
  private ispProxies: Map<string, ISPProxy>
  private requestQueue: Array<{ url: string; resolve: (value: any) => void; reject: (error: Error) => void }>
  private isProcessing: boolean
  private processedCount: number
  private preventedCalls: number
  private readonly minInterval: number = 1000

  constructor() {
    this.apiKey = process.env.SCRAPELESS_API_KEY || ''
    if (!this.apiKey) {
      throw new Error('SCRAPELESS_API_KEY environment variable is required')
    }

    this.ispProxies = loadISPProxiesFromEnv()
    this.requestQueue = []
    this.isProcessing = false
    this.processedCount = 0
    this.preventedCalls = 0
  }

  // Normalizes URL format by adding protocol and validating structure
  private normalizeURL(url: string): string {
    if (!url) {
      throw new Error('URL is required')
    }

    url = url.trim()

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`
    }

    try {
      const urlObj = new URL(url)
      return urlObj.toString()
    } catch (error) {
      throw new Error(`Invalid URL format: ${url}`)
    }
  }
  // Fetches HTML content using SCRAPELESS with ISP/residential proxy fallback strategy
  async getHTMLContent(url: string): Promise<string | null> {
    const normalizedUrl = this.normalizeURL(url)
    
    const preferredCountry = getPreferredCountryFromURL(normalizedUrl)
    const hasISPForPreferred = this.ispProxies.has(preferredCountry)

    try {
      const html = await this.getHTMLWithWebUnlocker(
        url,
        hasISPForPreferred,
        hasISPForPreferred ? null : preferredCountry,
        hasISPForPreferred ? this.ispProxies.get(preferredCountry) : undefined,
      )
      if (html) return html
    } catch (error: any) {
      const errorMsg = error?.message || ''
      if (errorMsg.includes('Insufficient balance')) {
        throw error
      }
    }

    if (preferredCountry === 'DE' && this.ispProxies.has('US')) {
      try {
        const html = await this.getHTMLWithWebUnlocker(url, true, null, this.ispProxies.get('US'))
        if (html) return html
      } catch (error: any) {
        const errorMsg = error?.message || ''
        if (errorMsg.includes('Insufficient balance')) {
          throw error
        }
      }
    }

    try {
      return await this.getHTMLWithWebUnlocker(url, false, null)
    } catch (error: any) {
      return null
    }
  }
  // Internal method to fetch HTML via SCRAPELESS Web Unlocker API with proxy configuration
  private async getHTMLWithWebUnlocker(
    url: string,
    useISPProxy: boolean,
    proxyCountry: string | null,
    ispProxy?: ISPProxy,
  ): Promise<string | null> {
    try {
      const proxyConfig: any = {}

      if (useISPProxy && ispProxy) {
        proxyConfig.url = generateISPProxyURL(ispProxy)
      } else if (proxyCountry) {
        proxyConfig.country = proxyCountry
      }

      const request: any = {
        actor: 'unlocker.webunlocker',
        input: {
          url: url,
          jsRender: {
            enabled: true,
            headless: true,
            waitUntil: 'domcontentloaded',
            response: {
              type: 'html' as const,
            },
          },
        },
      }

      if (Object.keys(proxyConfig).length > 0) {
        request.proxy = proxyConfig
      }

      const endpoint = 'https://api.scrapeless.com/api/v2/unlocker/request'
      const httpResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-token': this.apiKey,
        },
        body: JSON.stringify(request),
      })

      if (!httpResponse.ok) {
        const errorText = await httpResponse.text().catch(() => 'Unknown error')
        throw new Error(`SCRAPELESS API HTTP error: ${httpResponse.status} - ${errorText.substring(0, 200)}`)
      }

      const htmlResponse = await httpResponse.text()
      
      if (htmlResponse.trim().startsWith('{')) {
        try {
          const jsonData = JSON.parse(htmlResponse)
          const responseCode = jsonData.code !== undefined ? jsonData.code : (jsonData.statusCode || httpResponse.status)
          
          if (responseCode === 200) {
            if (jsonData.data) {
              return typeof jsonData.data === 'string' ? jsonData.data : (jsonData.data.html || jsonData.data.data || '')
            }
            if (jsonData.result) {
              return typeof jsonData.result === 'string' ? jsonData.result : (jsonData.result.html || jsonData.result.data || '')
            }
          } else {
            const errorMsg = jsonData.error || jsonData.message || `Code ${responseCode}`
            throw new Error(`SCRAPELESS API error (code ${responseCode}): ${errorMsg}`)
          }
        } catch (parseError: any) {
        }
      }
      
      return htmlResponse && htmlResponse.length > 100 ? htmlResponse : null
    } catch (error: any) {
      return null
    }
  }
  // Detects accessibility widget scripts in HTML by parsing script tags for widget URLs
  private detectWidgetsFromHTML(html: string): { found: boolean; scripts: Array<{ url: string; isExactMatch: boolean }> } {
    const widgetUrls = [
      'https://widget.access-widget.com/widget.min.js',
      'https://widget.webability.io/widget.min.js',
      'https://widget-v2.webability.io/widget.min.js',
    ]

    const foundWidgets: Array<{ url: string; isExactMatch: boolean }> = []

    const scriptRegex = /<script[^>]*src=["']([^"']+)["'][^>]*>/gi
    let match

    while ((match = scriptRegex.exec(html)) !== null) {
      const scriptSrc = match[1]
      if (scriptSrc) {
        widgetUrls.forEach((widgetUrl) => {
          if (scriptSrc.includes(widgetUrl) || scriptSrc.includes('widget.min.js')) {
            foundWidgets.push({
              url: scriptSrc,
              isExactMatch: scriptSrc.includes(widgetUrl),
            })
          }
        })
      }
    }

    return {
      found: foundWidgets.length > 0,
      scripts: foundWidgets,
    }
  }

  // Captures screenshot as base64 PNG via SCRAPELESS Web Unlocker API with proxy support
  private async captureWithWebUnlocker(
    url: string,
    useISPProxy: boolean,
    proxyCountry: string | null,
    ispProxy?: ISPProxy,
  ): Promise<string | null> {
    try {
      const proxyConfig: any = {}

      if (useISPProxy && ispProxy) {
        proxyConfig.url = generateISPProxyURL(ispProxy)
      } else if (proxyCountry) {
        proxyConfig.country = proxyCountry
      }

      const request: any = {
        actor: 'unlocker.webunlocker',
        input: {
          url: url,
          jsRender: {
            enabled: true,
            headless: true,
            waitUntil: 'networkidle2',
            response: {
              type: 'png' as const,
              options: {
                fullPage: false,
              },
            },
          },
        },
      }

      if (Object.keys(proxyConfig).length > 0) {
        request.proxy = proxyConfig
      }

      const endpoint = 'https://api.scrapeless.com/api/v2/unlocker/request'
      const httpResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-token': this.apiKey,
        },
        body: JSON.stringify(request),
      })

      if (!httpResponse.ok) {
        const errorText = await httpResponse.text().catch(() => 'Unknown error')
        throw new Error(`SCRAPELESS API HTTP error: ${httpResponse.status} - ${errorText.substring(0, 200)}`)
      }

      let data: any
      try {
        data = await httpResponse.json()
      } catch (parseError: any) {
        const textResponse = await httpResponse.text().catch(() => '')
        if (textResponse && textResponse.length > 100 && !textResponse.trim().startsWith('{')) {
          return textResponse
        } else {
          throw new Error(`Invalid JSON response: ${textResponse.substring(0, 200)}`)
        }
      }

      const responseCode = data.code !== undefined ? data.code : (data.statusCode || httpResponse.status)

      if (responseCode === 200) {
        let screenshotData: string | null = null

        if (data.data) {
          if (typeof data.data === 'string') {
            const dataStr = data.data.trim()
            if (dataStr.startsWith('{') && (dataStr.includes('statusCode') || dataStr.includes('message') || dataStr.includes('error'))) {
              try {
                const errorObj = JSON.parse(dataStr)
                if (errorObj.statusCode && errorObj.statusCode !== 200) {
                  const errorMsg = errorObj.message || errorObj.error || `Status ${errorObj.statusCode}`
                  
                  if (errorMsg.includes('ERR_ABORTED')) {
                    throw new Error(`Request aborted: ${errorMsg}`)
                  }
                  if (errorMsg.includes('ERR_CERT_COMMON_NAME_INVALID') || errorMsg.includes('CERT_COMMON_NAME_INVALID')) {
                    throw new Error(`SSL certificate error: ${errorMsg}`)
                  }
                  if (errorMsg.includes('ERR_TUNNEL_CONNECTION_FAILED') || errorMsg.includes('TUNNEL_CONNECTION_FAILED')) {
                    throw new Error(`Proxy tunnel connection failed: ${errorMsg}`)
                  }
                  
                  throw new Error(`API error in data field: ${errorMsg}`)
                }
              } catch (parseError: any) {
                if (parseError.message && (parseError.message.includes('API error') || parseError.message.includes('aborted') || parseError.message.includes('certificate') || parseError.message.includes('tunnel'))) {
                  throw parseError
                }
              }
            }
            screenshotData = data.data
          } else if (typeof data.data === 'object') {
            screenshotData = data.data.screenshot || data.data.image || data.data.data
          }
        }

        if (!screenshotData && data.result) {
          if (typeof data.result === 'string') {
            screenshotData = data.result
          } else if (typeof data.result === 'object') {
            screenshotData = data.result.screenshot || data.result.image || data.result.data
          }
        }

        if (!screenshotData) {
          screenshotData = data.screenshot || data.image
        }

        if (!screenshotData) {
          throw new Error('Empty screenshot data in response')
        }

        if (typeof screenshotData === 'string' && screenshotData.length < 200) {
          if (screenshotData.trim().startsWith('{')) {
            try {
              const errorObj = JSON.parse(screenshotData)
              if (errorObj.statusCode || errorObj.message || errorObj.error) {
                const errorMsg = errorObj.message || errorObj.error || JSON.stringify(errorObj)
                throw new Error(`API returned error instead of image: ${errorMsg}`)
              }
            } catch (parseError: any) {
              if (parseError.message && parseError.message.includes('API returned error')) {
                throw parseError
              }
            }
          }
          if (screenshotData.length < 100) {
            throw new Error(`Screenshot data too short (likely error message): ${screenshotData.substring(0, 100)}`)
          }
        }

        if (typeof screenshotData === 'string' && screenshotData.startsWith('data:image')) {
          screenshotData = screenshotData.split(',', 1)[1]
        }

        if (typeof screenshotData === 'string') {
          const base64Regex = /^[A-Za-z0-9+/=]+$/
          if (!base64Regex.test(screenshotData.replace(/\s/g, ''))) {
            throw new Error(`Invalid base64 format. First 100 chars: ${screenshotData.substring(0, 100)}`)
          }
        }

        try {
          const imageBuffer = Buffer.from(screenshotData, 'base64')
          if (!imageBuffer || imageBuffer.length < 100) {
            throw new Error(`Decoded image data too small: ${imageBuffer.length} bytes`)
          }

          return screenshotData
        } catch (decodeError: any) {
          throw new Error(`Failed to decode base64 image: ${decodeError.message}`)
        }
      } else {
        const errorMsg = data.error || data.message || `Code ${responseCode}`
        const errorStr = typeof errorMsg === 'string' ? errorMsg : String(errorMsg || '')

        if (responseCode === 14500 || errorStr.toLowerCase().includes('insufficient balance')) {
          throw new Error('Insufficient balance')
        }

        if (errorStr.includes('ERR_TUNNEL_CONNECTION_FAILED') || errorStr.includes('TUNNEL_CONNECTION_FAILED')) {
          throw new Error(`Proxy tunnel connection failed: ${errorStr}`)
        }

        throw new Error(`SCRAPELESS API error (code ${responseCode}): ${errorStr}`)
      }
    } catch (error: any) {
      throw error
    }
  }

  // Captures screenshot and detects widgets using proxy fallback strategy (ISP → US ISP → Residential)
  private async captureSingleWithWidgetDetection(
    url: string,
  ): Promise<{ screenshot: string | null; widgetDetection: { found: boolean; scripts: Array<{ url: string; isExactMatch: boolean }> } }> {
    const normalizedUrl = this.normalizeURL(url)
    const preferredCountry = getPreferredCountryFromURL(normalizedUrl)
    const hasISPForPreferred = this.ispProxies.has(preferredCountry)
    let widgetDetection = { found: false, scripts: [] as Array<{ url: string; isExactMatch: boolean }> }

    let screenshot: string | null = null

    try {
      screenshot = await this.captureWithWebUnlocker(
        normalizedUrl,
        hasISPForPreferred,
        hasISPForPreferred ? null : preferredCountry,
        hasISPForPreferred ? this.ispProxies.get(preferredCountry) : undefined,
      )

      if (screenshot) {
        const html = await this.getHTMLWithWebUnlocker(
          normalizedUrl,
          hasISPForPreferred,
          hasISPForPreferred ? null : preferredCountry,
          hasISPForPreferred ? this.ispProxies.get(preferredCountry) : undefined,
        )
        if (html) {
          widgetDetection = this.detectWidgetsFromHTML(html)
        }
        return { screenshot, widgetDetection }
      }
    } catch (error: any) {
      const errorMsg = error?.message || ''
      if (errorMsg.includes('Insufficient balance')) {
        throw error
      }
    }

    if (preferredCountry === 'DE' && this.ispProxies.has('US')) {
      try {
        screenshot = await this.captureWithWebUnlocker(normalizedUrl, true, null, this.ispProxies.get('US'))
        if (screenshot) {
          const html = await this.getHTMLWithWebUnlocker(normalizedUrl, true, null, this.ispProxies.get('US'))
          if (html) {
            widgetDetection = this.detectWidgetsFromHTML(html)
          }
          return { screenshot, widgetDetection }
        }
      } catch (error: any) {
        const errorMsg = error?.message || ''
        if (errorMsg.includes('Insufficient balance')) {
          throw error
        }
      }
    }

    try {
      screenshot = await this.captureWithWebUnlocker(normalizedUrl, false, null)
      if (screenshot) {
        const html = await this.getHTMLWithWebUnlocker(normalizedUrl, false, null)
        if (html) {
          widgetDetection = this.detectWidgetsFromHTML(html)
        }
        return { screenshot, widgetDetection }
      }
    } catch (error: any) {
      const errorMsg = error?.message || ''
      if (errorMsg.includes('Insufficient balance')) {
        throw error
      }
    }

    return { screenshot: null, widgetDetection }
  }
  // Captures screenshot only (without widget detection) by calling captureSingleWithWidgetDetection
  private async captureSingle(url: string): Promise<string | null> {
    try {
      const normalizedUrl = this.normalizeURL(url)
      const result = await this.captureSingleWithWidgetDetection(normalizedUrl)
      return result.screenshot
    } catch (error: any) {
      throw error
    }
  }

  // Public method to capture screenshot with widget detection, queues requests for sequential processing
  async captureScreenshotWithWidgetDetection(url: string): Promise<{
    screenshot: string | null
    widgetDetection: { found: boolean; scripts: Array<{ url: string; isExactMatch: boolean }> }
  } | null> {
    return new Promise((resolve, reject) => {
      let normalizedUrl: string
      try {
        normalizedUrl = this.normalizeURL(url)
      } catch (error: any) {
        this.preventedCalls++
        resolve(null)
        return
      }

      this.requestQueue.push({
        url: normalizedUrl,
        resolve: (result) => {
          if (result) {
            resolve(result as any)
          } else {
            resolve(null)
          }
        },
        reject,
      })

      if (!this.isProcessing) {
        this.processQueueWithWidgetDetection().catch((error) => {
          console.error('Queue processor error:', error)
        })
      }
    })
  }

  // Processes queued screenshot+widget detection requests sequentially with rate limiting
  private async processQueueWithWidgetDetection(): Promise<void> {
    if (this.isProcessing) {
      return
    }

    this.isProcessing = true

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift()
      if (!request) break

      try {
        if (this.processedCount > 0) {
          await new Promise((resolve) => setTimeout(resolve, this.minInterval))
        }

        const result = await this.captureSingleWithWidgetDetection(request.url)
        this.processedCount++
        request.resolve(result as any)
      } catch (error) {
        request.reject(error instanceof Error ? error : new Error(String(error)))
      }
    }

    this.isProcessing = false
  }

  // Processes queued screenshot-only requests sequentially with rate limiting
  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return
    }

    this.isProcessing = true

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift()
      if (!request) break

      try {
        if (this.processedCount > 0) {
          await new Promise((resolve) => setTimeout(resolve, this.minInterval))
        }

        const result = await this.captureSingle(request.url)
        this.processedCount++
        request.resolve(result)
      } catch (error) {
        request.reject(error instanceof Error ? error : new Error(String(error)))
      }
    }

    this.isProcessing = false
  }

  // Public method to capture screenshot only, queues requests for sequential processing
  async captureScreenshot(url: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      let normalizedUrl: string
      try {
        normalizedUrl = this.normalizeURL(url)
      } catch (error: any) {
        this.preventedCalls++
        resolve(null)
        return
      }

      this.requestQueue.push({ url: normalizedUrl, resolve, reject })

      if (!this.isProcessing) {
        this.processQueue().catch((error) => {
          console.error('Queue processor error:', error)
        })
      }
    })
  }
  // Returns current queue status including size, processing state, and statistics
  getQueueStatus() {
    return {
      queue_size: this.requestQueue.length,
      is_processing: this.isProcessing,
      processed_count: this.processedCount,
      prevented_calls: this.preventedCalls,
      cost_saved: `$${(this.preventedCalls * 0.01).toFixed(2)}`,
      min_interval: this.minInterval / 1000,
      isp_proxies_loaded: Array.from(this.ispProxies.keys()),
    }
  }

  // Removes temporary file from filesystem if it exists (used for cleanup operations)
  cleanupTempFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    } catch (error) {
    }
  }
}

let serviceInstance: ScrapelessScreenshotService | null = null

// Returns singleton instance of ScrapelessScreenshotService for application-wide use
export function getScrapelessScreenshotService(): ScrapelessScreenshotService {
  if (!serviceInstance) {
    serviceInstance = new ScrapelessScreenshotService()
  }
  return serviceInstance
}
