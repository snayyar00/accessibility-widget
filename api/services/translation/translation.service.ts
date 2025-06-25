import OpenAI from 'openai';
import dotenv from 'dotenv';
import * as Sentry from '@sentry/node';
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
  content: TranslationContent | string;
  targetLanguage: string;
  languageCode: string;
  context?: string; // JSON string with contextual information
}

interface TranslationResult {
  success: boolean;
  translatedContent?: any; // Can be string or object
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

// Clean cache every hour - store reference for cleanup
const cacheCleanupInterval = setInterval(cleanCache, 60 * 60 * 1000);

// Allow graceful shutdown
process.on('SIGTERM', () => {
  clearInterval(cacheCleanupInterval);
  console.log('Translation service cache cleanup interval cleared');
});

process.on('SIGINT', () => {
  clearInterval(cacheCleanupInterval);
  console.log('Translation service cache cleanup interval cleared');
});

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

// Helper function to split content into batches
const splitContentIntoBatches = (content: TranslationContent, batchSize: number): TranslationContent[] => {
  const entries = Object.entries(content);
  const batches: TranslationContent[] = [];
  
  for (let i = 0; i < entries.length; i += batchSize) {
    const batchEntries = entries.slice(i, i + batchSize);
    const batch = Object.fromEntries(batchEntries);
    batches.push(batch);
  }
  
  return batches;
};

// Enhanced prompt builder with contextual information
const buildEnhancedTranslationPrompt = (content: TranslationContent | string, targetLanguage: string, context?: any): string => {
  const contextInfo = context ? JSON.parse(context) : {};
  const {
    domain = 'accessibility-legal',
    documentType = 'compliance-statement',
    industry = 'business',
    enhancement = '',
    preserveTerms = ['WCAG', 'ADA', 'Section 508', 'ARIA', 'NVDA', 'JAWS', 'VoiceOver', 'TalkBack']
  } = contextInfo;

  // Build specialized system prompt based on context
  const systemPrompt = `You are a professional translator specializing in ${domain} documents for the ${industry} industry.

TARGET LANGUAGE: ${targetLanguage}
DOCUMENT TYPE: ${documentType}
DOMAIN: ${domain}

CRITICAL REQUIREMENTS:
1. Use formal, professional legal language appropriate for ${targetLanguage}
2. Preserve these technical terms exactly: ${preserveTerms.join(', ')}
3. Keep URLs, email addresses, and brand names unchanged
4. Maintain document structure and formatting (markdown, JSON structure)
5. Use official accessibility terminology in ${targetLanguage}
6. Sound natural to native ${targetLanguage} speakers
7. Maintain legal/compliance tone appropriate for ${documentType}

ACCESSIBILITY TERMINOLOGY GUIDELINES:
- "screen reader" → use correct official ${targetLanguage} term
- "assistive technology" → use formal ${targetLanguage} translation
- "accessibility statement" → use legal ${targetLanguage} equivalent
- "keyboard navigation" → use technical ${targetLanguage} term
- "compliance" → use legal ${targetLanguage} term

UNIVERSAL TRANSLATION RULES:
- NEVER mix languages except for preserved technical terms and URLs
- Use consistent terminology throughout the entire document
- Maintain formal, professional register appropriate for legal documents
- Format dates, numbers, and currency according to target locale conventions
- Preserve technical acronyms (WCAG, ADA, etc.) but translate their descriptions
- Keep company names in original language but translate surrounding context
- Use culturally appropriate honorifics and formal address forms
- Maintain document structure and JSON formatting exactly

${enhancement ? `SPECIAL FOCUS: ${getEnhancementContext(enhancement)}` : ''}

INDUSTRY CONTEXT: ${industry} - ensure terminology is appropriate for this sector.

Return the translation in the exact same format as the input (JSON structure if JSON input, plain text if text input).`;

  const contentToTranslate = typeof content === 'object' ? JSON.stringify(content, null, 2) : content;

  return `${systemPrompt}

CONTENT TO TRANSLATE:
${contentToTranslate}

Return ONLY the translated content:`;
};

// Get enhancement context descriptions
const getEnhancementContext = (enhancement: string): string => {
  const descriptions = {
    'add-testing': 'Include detailed technical testing procedures and automated tools',
    'add-timeline': 'Emphasize response timelines and support processes',
    'add-training': 'Highlight staff training and certification programs',
    'add-standards': 'Focus on multiple compliance standards and regulations'
  };
  return descriptions[enhancement as keyof typeof descriptions] || '';
};

// Helper function to translate a single batch
const translateBatch = async (
  batch: TranslationContent, 
  targetLanguage: string, 
  batchIndex: number,
  context?: any
): Promise<TranslationContent> => {
  const translationPrompt = buildEnhancedTranslationPrompt(batch, targetLanguage, context);

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
      top_p: 0.9,
      presence_penalty: 0.1
    }),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`Batch ${batchIndex} timeout`)), TRANSLATION_CONFIG.batching.batchTimeout)
    )
  ]) as any;

  const translatedText = response.choices[0]?.message?.content;
  
  if (!translatedText) {
    throw new Error(`No translation content received for batch ${batchIndex}`);
  }

  // Parse the translated JSON
  try {
    return JSON.parse(translatedText);
  } catch (firstError) {
    // Extract JSON from response if wrapped in text
    const jsonMatch = translatedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error(`No JSON found in batch ${batchIndex} response`);
    return JSON.parse(jsonMatch[0]);
  }
};

export const translateStatement = async ({
  content,
  targetLanguage,
  languageCode,
  context
}: TranslationRequest): Promise<TranslationResult> => {
  const startTime = Date.now();
  
  try {
    // Check cache first
    const cacheKey = `${TRANSLATION_CONFIG.cache.keyPrefix}${languageCode}`;
    const cached = getFromCache(cacheKey);
    
    if (cached) {
      const serializedCached = typeof cached === 'object' ? JSON.stringify(cached) : cached;
      return {
        success: true,
        translatedContent: serializedCached,
        languageCode,
        cached: true
      };
    }

    // If English, return original content
    if (languageCode === 'en') {
      const serializedContent = typeof content === 'object' ? JSON.stringify(content) : content;
      return {
        success: true,
        translatedContent: serializedContent,
        languageCode,
        cached: false
      };
    }

    // Handle content (should be a prompt string from frontend)
    let translatedContent: any;
    
    
    const response = await Promise.race([
      openai.chat.completions.create({
        model: TRANSLATION_CONFIG.model.name,
        messages: [
          {
            role: 'system',
            content: 'You are a professional translator specializing in accessibility and legal documents. Always respond with valid JSON only. Follow the instructions in the user prompt exactly.'
          },
          {
            role: 'user',
            content: String(content) // Ensure it's a string
          }
        ],
        temperature: TRANSLATION_CONFIG.model.temperature,
        max_tokens: TRANSLATION_CONFIG.model.maxTokens,
        stream: false,
        top_p: 0.9,
        presence_penalty: 0.1
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Translation timeout')), TRANSLATION_CONFIG.model.timeout)
      )
    ]) as any;

    const translatedText = response.choices[0]?.message?.content;
    
    if (!translatedText) {
      throw new Error('No translation content received from OpenRouter');
    }

    // Parse JSON response
    try {
      // First try to remove markdown code blocks if present
      let cleanedText = translatedText;
      if (translatedText.includes('```json')) {
        cleanedText = translatedText.replace(/^```json\s*/m, '').replace(/\s*```$/m, '');
      }
      
      translatedContent = JSON.parse(cleanedText);
    } catch (firstError) {
      // Try to extract JSON from response if direct parsing fails
      const jsonMatch = translatedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid translation response format');
      }
      
      try {
        translatedContent = JSON.parse(jsonMatch[0]);
      } catch (secondError) {
        throw new Error('Translation service error');
      }
    }

    // Cache the translation
    setCache(cacheKey, translatedContent);
    
    // Track usage metrics for monitoring
    const duration = Date.now() - startTime;
    const contentSize = typeof content === 'object' ? Object.keys(content).length : content.length;
    
    // Log metrics only in production for monitoring
    if (process.env.NODE_ENV === 'production') {
      console.info('Translation completed', {
        language: languageCode,
        duration,
        contentSize,
        cached: false,
        timestamp: new Date().toISOString()
      });
    }

    // Serialize the response for GraphQL
    const serializedContent = typeof translatedContent === 'object' 
      ? JSON.stringify(translatedContent) 
      : translatedContent;

    return {
      success: true,
      translatedContent: serializedContent,
      languageCode,
      cached: false
    };

  } catch (error) {
    // Enhanced error logging for production monitoring
    const errorMessage = error instanceof Error ? error.message : 'Unknown translation error';
    const contentSize = Object.keys(content).length;
    const batchingUsed = TRANSLATION_CONFIG.batching.enabled && contentSize > TRANSLATION_CONFIG.batching.maxBatchSize;
    const errorDetails = {
      targetLanguage,
      languageCode,
      error: errorMessage,
      timestamp: new Date().toISOString(),
      contentLength: JSON.stringify(content).length,
      contentFields: contentSize,
      batchingEnabled: TRANSLATION_CONFIG.batching.enabled,
      batchingUsed,
      model: TRANSLATION_CONFIG.model.name
    };
    
    console.error('Translation service error:', errorDetails);
    
    // Send to monitoring service if available
    if (process.env.SENTRY_DSN) {
      try {
        Sentry.captureException(error, {
          tags: { service: 'translation' },
          extra: errorDetails
        });
      } catch (sentryError) {
        console.error('Failed to report error to Sentry:', sentryError);
      }
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