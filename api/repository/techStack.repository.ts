import { URL } from 'url'

// --- Types ---

interface TechStackApiResponse {
  status: string
  message: string
  data: TechStackData
  performance?: {
    request_time_seconds: number
    cached: boolean
  }
}

interface TechStackData {
  url: string
  analyzed_at: string
  analysis_id: string
  tech_stack: {
    frontend: {
      primary: string | null
      frameworks: string[]
      libraries: string[]
      css_framework: string | null
      build_tools: string[]
    }
    backend: {
      cms: string | null
      server: string | null
      language: string | null
      hosting: string | null
    }
    services: {
      analytics: string[]
      ecommerce: string[]
      performance: string[]
      accessibility: string[]
    }
  }
  architecture: {
    type: string
    rendering: string
    is_spa: boolean
  }
  confidence: {
    scores: Record<string, number>
    overall: number
  }
  accessibility_context: {
    platform: string
    platform_type: string
    has_cms: boolean
    has_ecommerce: boolean
    has_framework: boolean
    is_spa: boolean
    existing_a11y_tools: string[]
  }
  ai_analysis: {
    used: boolean
    reason: string
    execution_time: number
    validated_technologies: string[]
    additional_findings: string[]
    architecture_confidence: number
    overrides_applied: string[]
  }
  performance: {
    analysis_time: number
    cached: boolean
    technologies_detected: number
  }
  request_info: {
    request_id: string
    client_ip: string
    user_agent: string
    force_refresh: boolean
    request_time: string
  }
}

// --- Constants ---

const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes
const API_TIMEOUT = 15000 // 15 seconds
const MAX_RETRIES = 2
const RETRY_DELAY = 1000 // 1 second

const cache = new Map<string, { data: any; timestamp: number }>()

// --- Helper Functions ---

function createFallbackResponse(url: string = '') {
  return {
    technologies: ['Unknown'],
    detectedTechnologies: ['Unknown'],
    categorizedTechnologies: [] as Array<{ category: string; technologies: string[] }>,
    categories: ['Unknown'],
    confidence: 'low' as const,
    platform: 'Unknown',
    platformType: 'Unknown',
    accessibilityContext: {} as Partial<TechStackData['accessibility_context']>,
    architecture: {} as Partial<TechStackData['architecture']>,
    confidenceScores: {} as Partial<TechStackData['confidence']>,
    aiAnalysis: {} as Partial<TechStackData['ai_analysis']>,
    analyzedUrl: url,
    analyzedAt: new Date().toISOString(),
    source: 'external_api',
  }
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = API_TIMEOUT): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    return response
  } finally {
    clearTimeout(id)
  }
}

// --- Main Function ---

export async function fetchTechStackFromAPI(url: string) {
  if (!url) {
    throw new Error('Missing URL parameter')
  }

  const cacheKey = url
  const cachedData = cache.get(cacheKey)
  if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
    return cachedData.data
  }

  let lastError: any
  const apiUrl = `${process.env.SECONDARY_SERVER_URL || ''}/techstack/?url=${encodeURIComponent(url)}`

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const apiRes = await fetchWithTimeout(apiUrl, {
        headers: {
          'User-Agent': 'webAbilityFrontend',
          Accept: 'application/json',
        },
      })

      if (!apiRes.ok) {
        // If 4xx error, don't retry (likely client error)
        if (apiRes.status >= 400 && apiRes.status < 500) {
          throw new Error(`External API error: ${apiRes.status}`)
        }
        throw new Error(`External API error: ${apiRes.status}`)
      }

      const rawData = (await apiRes.json()) as unknown

      // Basic structure validation
      if (!rawData || typeof rawData !== 'object') {
        throw new Error('Invalid API response format')
      }

      const response = rawData as TechStackApiResponse

      if (response.status !== 'success' || !response.data) {
        throw new Error(response.message || 'API returned unsuccessful status')
      }

      const transformedData = transformResponse(response.data)

      cache.set(cacheKey, {
        data: transformedData,
        timestamp: Date.now(),
      })

      return transformedData
    } catch (error: any) {
      lastError = error
      console.warn(`Attempt ${attempt + 1} failed for ${url}: ${error.message}`)
      
      // Don't retry on abort (timeout) or if it's the last attempt
      if (error.name === 'AbortError' || attempt === MAX_RETRIES) {
        break
      }
      
      // Exponential backoff
      await sleep(RETRY_DELAY * Math.pow(2, attempt))
    }
  }

  console.error('All attempts to fetch tech stack failed:', lastError)
  return createFallbackResponse(url)
}

function transformResponse(data: TechStackData) {
  const techStack = data.tech_stack

  // Get platform information with fallbacks
  const platform = data.accessibility_context?.platform || data.architecture?.type || 'Unknown'
  const platformType = data.accessibility_context?.platform_type || (data.architecture?.is_spa ? 'Single Page App' : 'Unknown')

  // Collect all technologies
  const technologies: string[] = []

  // Frontend
  if (techStack.frontend) {
    if (techStack.frontend.primary) technologies.push(techStack.frontend.primary)
    if (techStack.frontend.frameworks) technologies.push(...techStack.frontend.frameworks)
    if (techStack.frontend.libraries) technologies.push(...techStack.frontend.libraries)
    if (techStack.frontend.css_framework) technologies.push(techStack.frontend.css_framework)
  }

  // Backend
  if (techStack.backend) {
    if (techStack.backend.cms) technologies.push(techStack.backend.cms)
    if (techStack.backend.server) technologies.push(techStack.backend.server)
    if (techStack.backend.language) technologies.push(techStack.backend.language)
    if (techStack.backend.hosting) technologies.push(techStack.backend.hosting)
  }

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
  const categorizedTechnologies: Array<{ category: string; technologies: string[] }> = []

  if (techStack.frontend) {
    const frontendTechs = [
      techStack.frontend.primary,
      ...(techStack.frontend.frameworks || []),
      ...(techStack.frontend.libraries || []),
      techStack.frontend.css_framework,
    ].filter((t): t is string => !!t)

    if (frontendTechs.length > 0) {
      categorizedTechnologies.push({
        category: 'Frontend',
        technologies: frontendTechs,
      })
    }
  }

  if (techStack.backend) {
    const backendTechs = [
      techStack.backend.cms,
      techStack.backend.server,
      techStack.backend.language,
      techStack.backend.hosting,
    ].filter((t): t is string => !!t)

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
  const overallConfidence = data.confidence?.overall || 0
  let confidence: 'low' | 'medium' | 'high' = 'low'
  if (overallConfidence > 70) confidence = 'high'
  else if (overallConfidence > 40) confidence = 'medium'

  return {
    technologies: uniqueTechnologies,
    detectedTechnologies: uniqueTechnologies,
    categorizedTechnologies,
    categories: categorizedTechnologies.map((cat) => cat.category),
    confidence,
    platform,
    platformType,
    accessibilityContext: data.accessibility_context,
    architecture: data.architecture,
    confidenceScores: data.confidence,
    aiAnalysis: data.ai_analysis,
    analyzedUrl: data.url || '',
    analyzedAt: data.analyzed_at || new Date().toISOString(),
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
