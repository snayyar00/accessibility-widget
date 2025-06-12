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
    if (!rawData || typeof rawData !== 'object' || !rawData.data) {
      throw new Error('Invalid API response format');
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
  const techStack = data.tech_stack || {};
  const platform = data.accessibility_context?.platform || 'Unknown';
  const platformType = data.accessibility_context?.platform_type || 'Unknown';

  const technologies = [
    techStack.frontend?.primary,
    ...(techStack.frontend?.frameworks || []),
    ...(techStack.frontend?.libraries || []),
    techStack.frontend?.css_framework,
    techStack.backend?.cms,
    techStack.backend?.server,
    techStack.backend?.language,
    ...(Object.values(techStack.services || {}).flat() as string[]),
  ].filter(Boolean);

  const uniqueTechnologies = [...new Set(technologies)];

  const categorizedTechnologies = [
    {
      category: 'Frontend',
      technologies: [
        techStack.frontend?.primary,
        ...(techStack.frontend?.frameworks || []),
        ...(techStack.frontend?.libraries || []),
        techStack.frontend?.css_framework,
      ].filter(Boolean),
    },
    {
      category: 'Backend',
      technologies: [
        techStack.backend?.cms,
        techStack.backend?.server,
        techStack.backend?.language,
      ].filter(Boolean),
    },
    {
      category: 'Analytics',
      technologies: techStack.services?.analytics || [],
    },
    {
      category: 'E-commerce',
      technologies: techStack.services?.ecommerce || [],
    },
  ].filter((category) => category.technologies.length > 0);

  return {
    technologies: uniqueTechnologies,
    categorizedTechnologies,
    confidence: data.confidence?.overall || 'low',
    accessibilityContext: data.accessibility_context || {},
    analyzedUrl: data.url || '',
    analyzedAt: data.analyzed_at || new Date().toISOString(),
    source: 'external_api',
  };
}