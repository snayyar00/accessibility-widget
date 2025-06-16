import fetch from 'node-fetch';

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const cache = new Map();

export async function fetchTechStackFromAPI(url: string) {
  if (!url) {
    throw new Error('Missing URL parameter');
  }

  const cacheKey = url;
  const cachedData = cache.get(cacheKey);
  if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
    return cachedData.data;
  }

  try {
    const apiUrl = `${process.env.SECONDARY_SERVER_URL}/techstack/?url=${encodeURIComponent(url)}`;
    const apiRes = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'webAbilityFrontend',
        'Accept': 'application/json',
      },
    });

    if (!apiRes.ok) {
      throw new Error(`External API error: ${apiRes.status}`);
    }

    const rawData = await apiRes.json();

    // Validate the response structure
    if (!rawData || typeof rawData !== 'object') {
      throw new Error('Invalid API response format');
    }

    if (!rawData.data) {
      throw new Error('Missing data in API response');
    }

    // Add default platform if missing
    if (!rawData.data.accessibility_context) {
      rawData.data.accessibility_context = {};
    }
    if (!rawData.data.accessibility_context.platform) {
      rawData.data.accessibility_context.platform = 'Unknown';
    }
    if (!rawData.data.accessibility_context.platform_type) {
      rawData.data.accessibility_context.platform_type = 'Unknown';
    }

    const transformedData = transformResponse(rawData.data);

    cache.set(cacheKey, {
      data: transformedData,
      timestamp: Date.now(),
    });

    return transformedData;
  } catch (error) {
    throw new Error(`Error processing request: ${error.message}`);
  }
}

function transformResponse(data: any) {
  if (!data) {
    throw new Error('No data received from API');
  }

  const techStack = data.tech_stack || {};

  // Get platform information with fallbacks
  const platform = data.accessibility_context?.platform || 
                  data.architecture?.platform || 
                  'Unknown';
  const platformType = data.accessibility_context?.platform_type || 
                      data.architecture?.platform_type || 
                      'Unknown';

  // Collect all technologies
  const technologies = [];

  // Frontend
  if (techStack.frontend?.primary) technologies.push(techStack.frontend.primary);
  if (techStack.frontend?.frameworks) technologies.push(...techStack.frontend.frameworks);
  if (techStack.frontend?.libraries) technologies.push(...techStack.frontend.libraries);
  if (techStack.frontend?.css_framework) technologies.push(techStack.frontend.css_framework);

  // Backend
  if (techStack.backend?.cms) technologies.push(techStack.backend.cms);
  if (techStack.backend?.server) technologies.push(techStack.backend.server);
  if (techStack.backend?.language) technologies.push(techStack.backend.language);
  if (techStack.backend?.hosting) technologies.push(techStack.backend.hosting);

  // Services
  if (techStack.services) {
    Object.values(techStack.services).forEach(serviceArray => {
      if (Array.isArray(serviceArray)) {
        technologies.push(...serviceArray);
      }
    });
  }

  // Remove duplicates and filter out null/undefined
  const uniqueTechnologies = [...new Set(technologies)].filter(Boolean);

  // Create categorized technologies
  const categorizedTechnologies = [];

  if (techStack.frontend && Object.values(techStack.frontend).some(v => v && (Array.isArray(v) ? v.length > 0 : true))) {
    const frontendTechs = [
      techStack.frontend.primary,
      ...(techStack.frontend.frameworks || []),
      ...(techStack.frontend.libraries || []),
      techStack.frontend.css_framework,
    ].filter(Boolean);

    if (frontendTechs.length > 0) {
      categorizedTechnologies.push({
        category: 'Frontend',
        technologies: frontendTechs,
      });
    }
  }

  if (techStack.backend && Object.values(techStack.backend).some(v => v)) {
    const backendTechs = [
      techStack.backend.cms,
      techStack.backend.server,
      techStack.backend.language,
      techStack.backend.hosting,
    ].filter(Boolean);

    if (backendTechs.length > 0) {
      categorizedTechnologies.push({
        category: 'Backend',
        technologies: backendTechs,
      });
    }
  }

  if (techStack.services?.analytics?.length > 0) {
    categorizedTechnologies.push({
      category: 'Analytics',
      technologies: techStack.services.analytics,
    });
  }

  if (techStack.services?.ecommerce?.length > 0) {
    categorizedTechnologies.push({
      category: 'E-commerce',
      technologies: techStack.services.ecommerce,
    });
  }

  // Determine confidence
  const overallConfidence = data.confidence?.overall || 0;
  let confidence = 'low';
  if (overallConfidence > 70) confidence = 'high';
  else if (overallConfidence > 40) confidence = 'medium';

  // Ensure we have at least one technology detected
  if (uniqueTechnologies.length === 0) {
    throw new Error('No technologies detected in the response');
  }

  return {
    technologies: uniqueTechnologies,
    detectedTechnologies: uniqueTechnologies,
    categorizedTechnologies,
    categories: categorizedTechnologies.map(cat => cat.category),
    confidence,
    platform,
    platformType,
    accessibilityContext: data.accessibility_context || {},
    architecture: data.architecture || {},
    confidenceScores: data.confidence || {},
    aiAnalysis: data.ai_analysis || {},
    analyzedUrl: data.url || '',
    analyzedAt: data.analyzed_at || new Date().toISOString(),
    source: 'external_api',
  };
}

// Optional: Add a cleanup function to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of cache.entries()) {
      if (now - value.timestamp > CACHE_DURATION) {
        cache.delete(key);
      }
    }
  }, 5 * 60 * 1000); // Cleanup every 5 minutes
}