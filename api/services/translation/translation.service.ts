import OpenAI from 'openai';
import dotenv from 'dotenv';
import { TRANSLATION_CONFIG } from '~/config/translation.config';

dotenv.config();

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "Webability.io",
    "X-Title": "Webability.io - AI Statement Generator",
  },
});

interface TranslationContent {
  [key: string]: string;
}

interface TranslationRequest {
  content: TranslationContent;
  targetLanguage: string;
  languageCode: string;
}

interface TranslationResult {
  success: boolean;
  translatedContent?: TranslationContent;
  error?: string;
  languageCode: string;
  cached: boolean;
}

// Fast in-memory cache configuration
const CACHE_DURATION = TRANSLATION_CONFIG.cache.duration * 1000; // Convert to milliseconds
const MAX_CACHE_SIZE = 1000; // Hardcoded cache limit
const translationCache = new Map<string, { content: TranslationContent; timestamp: number }>();

// Clean old cache entries and enforce size limits
const cleanCache = () => {
  const now = Date.now();
  const entries = Array.from(translationCache.entries());
  
  // Remove expired entries
  entries.forEach(([key, value]) => {
    if ((now - value.timestamp) > CACHE_DURATION) {
      translationCache.delete(key);
    }
  });
  
  // Enforce size limit by removing oldest entries
  if (translationCache.size > MAX_CACHE_SIZE) {
    const sortedEntries = Array.from(translationCache.entries())
      .sort(([,a], [,b]) => a.timestamp - b.timestamp);
    
    const toRemove = translationCache.size - MAX_CACHE_SIZE;
    for (let i = 0; i < toRemove; i++) {
      translationCache.delete(sortedEntries[i][0]);
    }
  }
  
  console.log(`Cache cleaned: ${translationCache.size} entries remaining`);
};

// Clean cache every hour
setInterval(cleanCache, 60 * 60 * 1000);

// Fast cache helper functions
const getFromCache = (key: string): TranslationContent | null => {
  const cached = translationCache.get(key);
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    return cached.content;
  }
  return null;
};

const setCache = (key: string, content: TranslationContent): void => {
  // Check cache size before adding
  if (translationCache.size >= MAX_CACHE_SIZE) {
    // Remove oldest entry to make space
    const oldestKey = Array.from(translationCache.entries())
      .sort(([,a], [,b]) => a.timestamp - b.timestamp)[0][0];
    translationCache.delete(oldestKey);
  }
  
  translationCache.set(key, {
    content,
    timestamp: Date.now()
  });
};

export const translateStatement = async ({
  content,
  targetLanguage,
  languageCode
}: TranslationRequest): Promise<TranslationResult> => {
  const startTime = Date.now();
  
  try {
    // Check cache first
    const cacheKey = `${TRANSLATION_CONFIG.cache.keyPrefix}${languageCode}`;
    const cached = getFromCache(cacheKey);
    
    if (cached) {
      return {
        success: true,
        translatedContent: cached,
        languageCode,
        cached: true
      };
    }

    // If English, return original content
    if (languageCode === 'en') {
      return {
        success: true,
        translatedContent: content,
        languageCode,
        cached: false
      };
    }

    // Professional translation prompt for high-quality results
    const translationPrompt = `You are a professional translator specializing in accessibility and legal documents.

Translate the following accessibility statement content from English to ${targetLanguage}.

IMPORTANT REQUIREMENTS:
1. Maintain all technical terms exactly (WCAG, HTML5, WAI-ARIA, etc.)
2. Keep all URLs and links unchanged
3. Preserve all markdown formatting (**bold**, [links](urls), - lists)
4. Use formal, professional language appropriate for legal/accessibility documents
5. Ensure cultural appropriateness for the target language
6. Maintain the exact same JSON structure
7. Keep placeholder text like [Your phone number] unchanged
8. Translate technical accessibility terms appropriately for the target language
9. Use proper formal titles and expressions for the target culture

Return ONLY a valid JSON object with the same structure as the input, with all values professionally translated to ${targetLanguage}.

Input JSON:
${JSON.stringify(content, null, 2)}

Respond with only the translated JSON object:`;

    // Call OpenRouter API with premium model for quality
    const response = await Promise.race([
      openai.chat.completions.create({
        model: TRANSLATION_CONFIG.model.name,
        messages: [
          {
            role: 'system',
            content: 'You are a professional translator specializing in accessibility and legal documents. Always respond with valid JSON only. Ensure high-quality, culturally appropriate translations.'
          },
          {
            role: 'user',
            content: translationPrompt
          }
        ],
        temperature: TRANSLATION_CONFIG.model.temperature,
        max_tokens: TRANSLATION_CONFIG.model.maxTokens,
        stream: false,
        top_p: 0.9, // High quality sampling
        presence_penalty: 0.1 // Encourage diverse vocabulary
      }),
      // Timeout promise
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Translation timeout')), TRANSLATION_CONFIG.model.timeout)
      )
    ]) as any;

    const translatedText = response.choices[0]?.message?.content;
    
    if (!translatedText) {
      throw new Error('No translation content received from OpenRouter');
    }

    // Fast JSON parsing with fallback
    let translatedContent: TranslationContent;
    try {
      // Try direct parse first (fastest)
      translatedContent = JSON.parse(translatedText);
    } catch (firstError) {
      try {
        // Extract JSON from response if wrapped in text
        const jsonMatch = translatedText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON found in response');
        translatedContent = JSON.parse(jsonMatch[0]);
      } catch (secondError) {
        console.error('JSON parse failed:', { translatedText, firstError, secondError });
        throw new Error('Invalid JSON response from translation API');
      }
    }

    // Cache the translation
    setCache(cacheKey, translatedContent);
    
    // Log successful translation for monitoring
    const duration = Date.now() - startTime;
    console.log(`Translation completed: ${languageCode} in ${duration}ms`);
    
    // Track usage metrics if needed
    if (process.env.NODE_ENV === 'production') {
      console.log(`Translation metrics: ${languageCode}, duration: ${duration}ms, cached: false`);
    }

    return {
      success: true,
      translatedContent,
      languageCode,
      cached: false
    };

  } catch (error) {
    // Enhanced error logging for production monitoring
    const errorMessage = error instanceof Error ? error.message : 'Unknown translation error';
    const errorDetails = {
      targetLanguage,
      languageCode,
      error: errorMessage,
      timestamp: new Date().toISOString(),
      contentLength: JSON.stringify(content).length,
      model: TRANSLATION_CONFIG.model.name
    };
    
    console.error('Translation service error:', errorDetails);
    
    // Send to monitoring service if available
    if (process.env.SENTRY_DSN) {
      // Sentry error tracking (already configured in the project)
      console.error('Sentry error tracking:', errorDetails);
    }
    
    // Return user-friendly error
    return {
      success: false,
      error: `Translation to ${targetLanguage} is temporarily unavailable`,
      languageCode,
      cached: false
    };
  }
};