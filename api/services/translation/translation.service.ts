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

// Helper function to translate a single batch
const translateBatch = async (
  batch: TranslationContent, 
  targetLanguage: string, 
  batchIndex: number
): Promise<TranslationContent> => {
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
${JSON.stringify(batch, null, 2)}

Respond with only the translated JSON object:`;

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

    // Check if batching is enabled and content is large enough to benefit
    const contentSize = Object.keys(content).length;
    let translatedContent: TranslationContent;
    
    if (TRANSLATION_CONFIG.batching.enabled && contentSize > TRANSLATION_CONFIG.batching.maxBatchSize) {
      console.log(`Using batching for ${languageCode}: ${contentSize} fields, splitting into batches of ${TRANSLATION_CONFIG.batching.maxBatchSize}`);
      
      // Split content into batches
      const batches = splitContentIntoBatches(content, TRANSLATION_CONFIG.batching.maxBatchSize);
      console.log(`Created ${batches.length} batches for translation`);
      
      // Process batches with controlled parallelism
      const translatedBatches: TranslationContent[] = [];
      const batchPromises: Promise<TranslationContent>[] = [];
      
      for (let i = 0; i < batches.length; i += TRANSLATION_CONFIG.batching.parallelBatches) {
        // Process a group of batches in parallel
        const currentBatchGroup = batches.slice(i, i + TRANSLATION_CONFIG.batching.parallelBatches);
        const groupPromises = currentBatchGroup.map((batch, index) => 
          translateBatch(batch, targetLanguage, i + index)
        );
        
        // Wait for current group to complete before starting next group
        const groupResults = await Promise.all(groupPromises);
        translatedBatches.push(...groupResults);
        
        console.log(`Completed batch group ${Math.floor(i / TRANSLATION_CONFIG.batching.parallelBatches) + 1}/${Math.ceil(batches.length / TRANSLATION_CONFIG.batching.parallelBatches)}`);
      }
      
      // Merge all translated batches back into a single object
      translatedContent = translatedBatches.reduce((merged, batch) => ({ ...merged, ...batch }), {});
      
    } else {
      // Use single request for smaller content or when batching is disabled
      console.log(`Using single request for ${languageCode}: ${contentSize} fields`);
      
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
          setTimeout(() => reject(new Error('Translation timeout')), TRANSLATION_CONFIG.model.timeout)
        )
      ]) as any;

      const translatedText = response.choices[0]?.message?.content;
      
      if (!translatedText) {
        throw new Error('No translation content received from OpenRouter');
      }

      // Parse JSON response
      try {
        translatedContent = JSON.parse(translatedText);
      } catch (firstError) {
        const jsonMatch = translatedText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON found in response');
        translatedContent = JSON.parse(jsonMatch[0]);
      }
    }

    // Cache the translation
    setCache(cacheKey, translatedContent);
    
    // Log successful translation for monitoring
    const duration = Date.now() - startTime;
    const batchingUsed = TRANSLATION_CONFIG.batching.enabled && contentSize > TRANSLATION_CONFIG.batching.maxBatchSize;
    console.log(`Translation completed: ${languageCode} in ${duration}ms${batchingUsed ? ' (batched)' : ' (single)'}`);
    
    // Track usage metrics if needed
    if (process.env.NODE_ENV === 'production') {
      console.log(`Translation metrics: ${languageCode}, duration: ${duration}ms, cached: false, batched: ${batchingUsed}, fields: ${contentSize}`);
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
      Sentry.captureException(error, {
        tags: { service: 'translation' },
        extra: errorDetails
      });
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