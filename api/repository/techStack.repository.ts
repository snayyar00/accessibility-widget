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

  // Helper function to extract string value from technology item
  const extractTechName = (tech: any): string | null => {
    if (typeof tech === 'string') return tech;
    if (tech && typeof tech === 'object') {
      return tech.name || tech.technology || tech.label || String(tech);
    }
    return null;
  };

  // Frontend
  if (techStack.frontend?.primary) {
    const name = extractTechName(techStack.frontend.primary);
    if (name) technologies.push(name);
  }
  if (techStack.frontend?.frameworks) {
    techStack.frontend.frameworks.forEach((fw: any) => {
      const name = extractTechName(fw);
      if (name) technologies.push(name);
    });
  }
  if (techStack.frontend?.libraries) {
    techStack.frontend.libraries.forEach((lib: any) => {
      const name = extractTechName(lib);
      if (name) technologies.push(name);
    });
  }
  if (techStack.frontend?.css_framework) {
    const name = extractTechName(techStack.frontend.css_framework);
    if (name) technologies.push(name);
  }

  // Backend
  if (techStack.backend?.cms) {
    const name = extractTechName(techStack.backend.cms);
    if (name) technologies.push(name);
  }
  if (techStack.backend?.server) {
    const name = extractTechName(techStack.backend.server);
    if (name) technologies.push(name);
  }
  if (techStack.backend?.language) {
    const name = extractTechName(techStack.backend.language);
    if (name) technologies.push(name);
  }
  if (techStack.backend?.hosting) {
    const name = extractTechName(techStack.backend.hosting);
    if (name) technologies.push(name);
  }

  // Services
  if (techStack.services) {
    Object.values(techStack.services).forEach(serviceArray => {
      if (Array.isArray(serviceArray)) {
        serviceArray.forEach((service: any) => {
          const name = extractTechName(service);
          if (name) technologies.push(name);
        });
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
    ].map(tech => extractTechName(tech)).filter(Boolean);

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
    ].map(tech => extractTechName(tech)).filter(Boolean);

    if (backendTechs.length > 0) {
      categorizedTechnologies.push({
        category: 'Backend',
        technologies: backendTechs,
      });
    }
  }

  if (techStack.services?.analytics?.length > 0) {
    const analyticsTechs = techStack.services.analytics.map((tech: any) => extractTechName(tech)).filter(Boolean);
    if (analyticsTechs.length > 0) {
      categorizedTechnologies.push({
        category: 'Analytics',
        technologies: analyticsTechs,
      });
    }
  }

  if (techStack.services?.ecommerce?.length > 0) {
    const ecommerceTechs = techStack.services.ecommerce.map((tech: any) => extractTechName(tech)).filter(Boolean);
    if (ecommerceTechs.length > 0) {
      categorizedTechnologies.push({
        category: 'E-commerce',
        technologies: ecommerceTechs,
      });
    }
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