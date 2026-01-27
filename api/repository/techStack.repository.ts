import { getScrapelessScreenshotService } from '../services/scrapeless-screenshot.service'

const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes
const cache = new Map()

function createFallbackResponse(url: string = '') {
  return {
    technologies: ['Unknown'],
    detectedTechnologies: ['Unknown'],
    categorizedTechnologies: [] as Array<{ category: string; technologies: string[] }>,
    categories: ['Unknown'],
    confidence: 'low' as const,
    platform: 'Unknown',
    platformType: 'Unknown',
    accessibilityContext: {},
    architecture: {},
    confidenceScores: {},
    aiAnalysis: {},
    analyzedUrl: url,
    analyzedAt: new Date().toISOString(),
    source: 'scrapeless',
  }
}

/**
 * HTML analysis for tech stack detection
 * Detects common technologies from HTML content
 */
function analyzeHTMLForTechStack(html: string, url: string): any {
  const technologies: string[] = []
  const frontend: string[] = []
  const backend: string[] = []
  const services: { analytics: string[]; ecommerce: string[] } = { analytics: [], ecommerce: [] }
  let platform = 'Unknown'
  let platformType = 'Unknown'
  let hasCMS = false
  let hasEcommerce = false
  let hasFramework = false
  let isSPA = false

  const htmlLower = html.toLowerCase()

  // Only detect most common frameworks/CMS (reduces maintenance burden)
  // Frontend: React, Vue, Angular (most popular SPAs)
  if (htmlLower.includes('react') || htmlLower.includes('react-dom') || htmlLower.includes('__react')) {
    frontend.push('React')
    hasFramework = true
    isSPA = true
  }
  if (htmlLower.includes('vue') || htmlLower.includes('vue.js') || htmlLower.includes('__vue__')) {
    frontend.push('Vue.js')
    hasFramework = true
    isSPA = true
  }
  if (htmlLower.includes('angular') || htmlLower.includes('ng-') || htmlLower.includes('angularjs')) {
    frontend.push('Angular')
    hasFramework = true
    isSPA = true
  }

  // CMS: WordPress, Shopify (most common)
  if (htmlLower.includes('wp-content') || htmlLower.includes('wordpress') || htmlLower.includes('/wp-includes/')) {
    backend.push('WordPress')
    platform = 'WordPress'
    platformType = 'CMS'
    hasCMS = true
  }
  if (htmlLower.includes('shopify') || htmlLower.includes('shopifycdn') || htmlLower.includes('myshopify.com')) {
    backend.push('Shopify')
    platform = 'Shopify'
    platformType = 'E-commerce'
    hasCMS = true
    hasEcommerce = true
  }

  // Analytics: Google Analytics (most common)
  if (htmlLower.includes('google-analytics') || htmlLower.includes('ga.js') || htmlLower.includes('gtag') || htmlLower.includes('analytics.js')) {
    services.analytics.push('Google Analytics')
  }

  // E-commerce: Stripe (most common payment)
  if (htmlLower.includes('stripe') || htmlLower.includes('stripe.com')) {
    services.ecommerce.push('Stripe')
  }

  // Collect all technologies
  technologies.push(...frontend, ...backend, ...services.analytics, ...services.ecommerce)

  // Remove duplicates
  const uniqueTechnologies = [...new Set(technologies)].filter(Boolean)

  // Create categorized technologies
  const categorizedTechnologies: Array<{ category: string; technologies: string[] }> = []

  if (frontend.length > 0) {
    categorizedTechnologies.push({
      category: 'Frontend',
      technologies: [...new Set(frontend)],
    })
  }

  if (backend.length > 0) {
    categorizedTechnologies.push({
      category: 'Backend',
      technologies: [...new Set(backend)],
    })
  }

  if (services.analytics.length > 0) {
    categorizedTechnologies.push({
      category: 'Analytics',
      technologies: services.analytics,
    })
  }

  if (services.ecommerce.length > 0) {
    categorizedTechnologies.push({
      category: 'E-commerce',
      technologies: services.ecommerce,
    })
  }

  // Determine confidence based on detection quality
  let confidence = 'low'
  const detectionScore = uniqueTechnologies.length * 10 + (hasCMS ? 20 : 0) + (hasFramework ? 15 : 0)
  if (detectionScore > 70) confidence = 'high'
  else if (detectionScore > 40) confidence = 'medium'

  return {
    technologies: uniqueTechnologies.length > 0 ? uniqueTechnologies : ['Unknown'],
    detectedTechnologies: uniqueTechnologies.length > 0 ? uniqueTechnologies : ['Unknown'],
    categorizedTechnologies,
    categories: categorizedTechnologies.map((cat) => cat.category),
    confidence,
    platform: platform !== 'Unknown' ? platform : undefined,
    platformType: platformType !== 'Unknown' ? platformType : undefined,
    accessibilityContext: {
      platform: platform !== 'Unknown' ? platform : 'Unknown',
      platform_type: platformType !== 'Unknown' ? platformType : 'Unknown',
      has_cms: hasCMS,
      has_ecommerce: hasEcommerce,
      has_framework: hasFramework,
      is_spa: isSPA,
    },
    architecture: {
      platform: platform !== 'Unknown' ? platform : undefined,
      platform_type: platformType !== 'Unknown' ? platformType : undefined,
    },
    confidenceScores: {
      overall: detectionScore,
      platform: hasCMS || hasFramework ? 80 : 30,
      cms: hasCMS ? 85 : 20,
      ecommerce: hasEcommerce ? 80 : 20,
    },
    aiAnalysis: {},
    analyzedUrl: url,
    analyzedAt: new Date().toISOString(),
    source: 'scrapeless',
  }
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

/**
 * Get HTML content using SCRAPELESS
 */
async function getHTMLWithScrapeless(url: string): Promise<string | null> {
  try {
    const normalizedUrl = normalizeURL(url)
    console.log(`🔧 Fetching HTML for tech stack from: ${normalizedUrl}`)
    
    const screenshotService = getScrapelessScreenshotService()
    return await screenshotService.getHTMLContent(normalizedUrl)
  } catch (error: any) {
    const errorMsg = error?.message || error?.toString() || JSON.stringify(error)
    console.error(`❌ Failed to get HTML with SCRAPELESS: ${errorMsg}`)
    if (error?.stack) {
      console.error(`   Stack: ${error.stack.substring(0, 200)}`)
    }
    return null
  }
}

export async function fetchTechStackFromAPI(url: string) {
  if (!url) {
    throw new Error('Missing URL parameter')
  }

  // Normalize URL for caching and processing
  let normalizedUrl: string
  try {
    normalizedUrl = normalizeURL(url)
  } catch (error: any) {
    const errorMsg = error?.message || error?.toString() || JSON.stringify(error)
    console.error(`❌ Invalid URL format: ${errorMsg}`)
    return createFallbackResponse(url)
  }

  const cacheKey = normalizedUrl
  const cachedData = cache.get(cacheKey)
  if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
    console.log('🔧 Using cached tech stack data')
    return cachedData.data
  }

  try {
    // PRIMARY: Use SCRAPELESS to fetch HTML and detect technologies
    console.log('🔧 Detecting tech stack using SCRAPELESS...')
    const html = await getHTMLWithScrapeless(normalizedUrl)
    
    if (!html) {
      throw new Error('Failed to fetch HTML with SCRAPELESS')
    }

    const techStackData = analyzeHTMLForTechStack(html, normalizedUrl)

    // Cache the result
    cache.set(cacheKey, {
      data: techStackData,
      timestamp: Date.now(),
    })

    console.log(`✅ Tech stack detected via SCRAPELESS: ${techStackData.technologies.join(', ')}`)
    return techStackData
  } catch (error: any) {
    const errorMsg = error?.message || error?.toString() || JSON.stringify(error)
    console.warn(`⚠️ SCRAPELESS tech stack detection failed: ${errorMsg}`)
    
    // FALLBACK: Try external API
    try {
      console.log('🔧 Falling back to external API...')
      return await fetchTechStackFromExternalAPI(normalizedUrl)
    } catch (fallbackError: any) {
      const fallbackMsg = fallbackError?.message || fallbackError?.toString() || JSON.stringify(fallbackError)
      console.warn(`⚠️ External API fallback also failed: ${fallbackMsg}`)
      return createFallbackResponse(normalizedUrl)
    }
  }
}

/**
 * Fallback function to fetch tech stack from external API
 */
async function fetchTechStackFromExternalAPI(url: string) {
  try {
    if (!process.env.SECONDARY_SERVER_URL) {
      throw new Error('SECONDARY_SERVER_URL environment variable is not configured')
    }

    const apiUrl = `${process.env.SECONDARY_SERVER_URL}/techstack/?url=${encodeURIComponent(url)}`
    console.log(`🔧 Fetching tech stack from external API: ${apiUrl}`)
    
    const apiRes = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'webAbilityFrontend',
        Accept: 'application/json',
      },
    })

    if (!apiRes.ok) {
      const errorText = await apiRes.text().catch(() => 'Unknown error')
      throw new Error(`External API error: ${apiRes.status} - ${errorText.substring(0, 200)}`)
    }

    const rawData = (await apiRes.json()) as { data?: Record<string, unknown> }

    // Validate the response structure
    if (!rawData || typeof rawData !== 'object') {
      throw new Error('Invalid API response format')
    }

    if (!rawData.data) {
      throw new Error('Missing data in API response')
    }

    // Add default platform if missing
    if (!('accessibility_context' in rawData.data)) {
      ;(rawData.data as any).accessibility_context = {}
    }
    if (!(rawData.data as any).accessibility_context.platform) {
      ;(rawData.data as any).accessibility_context.platform = 'Unknown'
    }
    if (!(rawData.data as any).accessibility_context.platform_type) {
      ;(rawData.data as any).accessibility_context.platform_type = 'Unknown'
    }

    const transformedData = transformResponse(rawData.data as Record<string, unknown>)

    const cacheKey = url
    cache.set(cacheKey, {
      data: transformedData,
      timestamp: Date.now(),
    })

    console.log(`✅ Tech stack fetched from external API: ${transformedData.technologies.join(', ')}`)
    return transformedData
  } catch (error: any) {
    const errorMsg = error?.message || error?.toString() || JSON.stringify(error)
    console.error(`❌ Error fetching tech stack from external API: ${errorMsg}`)
    if (error?.stack) {
      console.error(`   Stack: ${error.stack.substring(0, 300)}`)
    }
    throw error
  }
}

function transformResponse(data: Record<string, unknown>) {
  const d = data as any
  if (!d) {
    throw new Error('No data received from API')
  }

  const techStack = d.tech_stack || {}

  // Get platform information with fallbacks
  const platform = d.accessibility_context?.platform || d.architecture?.platform || 'Unknown'
  const platformType = d.accessibility_context?.platform_type || d.architecture?.platform_type || 'Unknown'

  // Collect all technologies
  const technologies = []

  // Frontend
  if (techStack.frontend?.primary) technologies.push(techStack.frontend.primary)
  if (techStack.frontend?.frameworks) technologies.push(...techStack.frontend.frameworks)
  if (techStack.frontend?.libraries) technologies.push(...techStack.frontend.libraries)
  if (techStack.frontend?.css_framework) technologies.push(techStack.frontend.css_framework)

  // Backend
  if (techStack.backend?.cms) technologies.push(techStack.backend.cms)
  if (techStack.backend?.server) technologies.push(techStack.backend.server)
  if (techStack.backend?.language) technologies.push(techStack.backend.language)
  if (techStack.backend?.hosting) technologies.push(techStack.backend.hosting)

  // Services
  if (techStack.services) {
    Object.values(techStack.services).forEach((serviceArray) => {
      if (Array.isArray(serviceArray)) {
        technologies.push(...serviceArray)
      }
    })
  }

  // Remove duplicates and filter out null/undefined
  const uniqueTechnologies = [...new Set(technologies)].filter(Boolean)

  // Create categorized technologies
  const categorizedTechnologies = []

  if (techStack.frontend && Object.values(techStack.frontend).some((v) => v && (Array.isArray(v) ? v.length > 0 : true))) {
    const frontendTechs = [techStack.frontend.primary, ...(techStack.frontend.frameworks || []), ...(techStack.frontend.libraries || []), techStack.frontend.css_framework].filter(Boolean)

    if (frontendTechs.length > 0) {
      categorizedTechnologies.push({
        category: 'Frontend',
        technologies: frontendTechs,
      })
    }
  }

  if (techStack.backend && Object.values(techStack.backend).some((v) => v)) {
    const backendTechs = [techStack.backend.cms, techStack.backend.server, techStack.backend.language, techStack.backend.hosting].filter(Boolean)

    if (backendTechs.length > 0) {
      categorizedTechnologies.push({
        category: 'Backend',
        technologies: backendTechs,
      })
    }
  }

  if (techStack.services?.analytics?.length > 0) {
    categorizedTechnologies.push({
      category: 'Analytics',
      technologies: techStack.services.analytics,
    })
  }

  if (techStack.services?.ecommerce?.length > 0) {
    categorizedTechnologies.push({
      category: 'E-commerce',
      technologies: techStack.services.ecommerce,
    })
  }

  // Determine confidence
  const overallConfidence = d.confidence?.overall || 0
  let confidence = 'low'
  if (overallConfidence > 70) confidence = 'high'
  else if (overallConfidence > 40) confidence = 'medium'

  // Ensure we have at least one technology detected
  if (uniqueTechnologies.length === 0) {
    throw new Error('No technologies detected in the response')
  }

  return {
    technologies: uniqueTechnologies,
    detectedTechnologies: uniqueTechnologies,
    categorizedTechnologies,
    categories: categorizedTechnologies.map((cat) => cat.category),
    confidence,
    platform,
    platformType,
    accessibilityContext: d.accessibility_context || {},
    architecture: d.architecture || {},
    confidenceScores: d.confidence || {},
    aiAnalysis: d.ai_analysis || {},
    analyzedUrl: d.url || '',
    analyzedAt: d.analyzed_at || new Date().toISOString(),
    source: 'external_api',
  }
}

// Optional: Add a cleanup function to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(
    () => {
      const now = Date.now()
      for (const [key, value] of cache.entries()) {
        if (now - value.timestamp > CACHE_DURATION) {
          cache.delete(key)
        }
      }
    },
    5 * 60 * 1000,
  ) // Cleanup every 5 minutes
}
