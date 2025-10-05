import { cacheTechStack } from '../services/cache/apiResponseCache.service'

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
    source: 'external_api',
  }
}

export async function fetchTechStackFromAPI(url: string) {
  if (!url) {
    throw new Error('Missing URL parameter')
  }

  try {
    // Use the new caching system with R2 + in-memory cache
    return await cacheTechStack(url, async () => {
      const apiUrl = `${process.env.SECONDARY_SERVER_URL}/techstack/?url=${encodeURIComponent(url)}`
      const apiRes = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'webAbilityFrontend',
          Accept: 'application/json',
        },
      })

      if (!apiRes.ok) {
        throw new Error(`External API error: ${apiRes.status}`)
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

      return transformResponse(rawData.data as Record<string, unknown>)
    })
  } catch (error) {
    console.error('Error fetching tech stack:', error)
    return createFallbackResponse(url)
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

// Cleanup is now handled automatically by the cacheManager
