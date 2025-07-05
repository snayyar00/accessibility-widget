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
}

// Cache functionality removed - was used for development testing only

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
    // Cache removed - was used for development only

    // If English, return original content
    if (languageCode === 'en') {
      const serializedContent = typeof content === 'object' ? JSON.stringify(content) : content;
      return {
        success: true,
        translatedContent: serializedContent,
        languageCode
      };
    }

    // Handle content (should be a prompt string from frontend)
    let translatedContent: any;
    
    // Check content size and disable batching for direct prompts
    const contentSize = typeof content === 'string' ? content.length : JSON.stringify(content).length;
    const shouldUseBatching = TRANSLATION_CONFIG.batching.enabled && 
                              typeof content === 'object' && 
                              Object.keys(content).length > TRANSLATION_CONFIG.batching.maxBatchSize;
    
    if (shouldUseBatching) {
      // Use batching for large object content
      const batches = splitContentIntoBatches(content as TranslationContent, TRANSLATION_CONFIG.batching.maxBatchSize);
      const batchPromises = batches.map((batch, index) => 
        translateBatch(batch, targetLanguage, index, context)
      );
      
      const batchResults = await Promise.all(batchPromises);
      translatedContent = batchResults.reduce((acc, batch) => ({ ...acc, ...batch }), {});
    } else {
      // Direct translation for string content or small objects
      let response;
      try {
        response = await Promise.race([
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
      } catch (primaryError) {
        console.warn(`Primary model ${TRANSLATION_CONFIG.model.name} failed, trying fallback:`, primaryError);
        
        // Fallback to alternative model
        response = await Promise.race([
          openai.chat.completions.create({
            model: TRANSLATION_CONFIG.model.fallback,
            messages: [
              {
                role: 'system',
                content: 'You are a professional translator specializing in accessibility and legal documents. Always respond with valid JSON only. Follow the instructions in the user prompt exactly.'
              },
              {
                role: 'user',
                content: String(content)
              }
            ],
            temperature: TRANSLATION_CONFIG.model.temperature,
            max_tokens: TRANSLATION_CONFIG.model.maxTokens,
            stream: false,
            top_p: 0.9,
            presence_penalty: 0.1
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Fallback translation timeout')), TRANSLATION_CONFIG.model.timeout)
          )
        ]) as any;
      }
      
      const translatedText = response.choices[0]?.message?.content;
      
      if (!translatedText) {
        console.error('No translation content received:', {
          response: response,
          choices: response.choices,
          model: TRANSLATION_CONFIG.model.name,
          contentLength: String(content).length
        });
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
          console.error('JSON parsing failed for translation:', {
            originalResponse: translatedText,
            jsonMatch: jsonMatch[0],
            error: secondError
          });
          throw new Error('Translation service error');
        }
      }
    }

    // Translation caching removed
    
    // Track usage metrics for monitoring
    const duration = Date.now() - startTime;
    const metricsContentSize = typeof content === 'object' ? Object.keys(content).length : content.length;
    
    // Log metrics only in production for monitoring
    if (process.env.NODE_ENV === 'production') {
      console.info('Translation completed', {
        language: languageCode,
        duration,
        contentSize: metricsContentSize,
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
      languageCode
    };

  } catch (error) {
    // Enhanced error logging for production monitoring
    const errorMessage = error instanceof Error ? error.message : 'Unknown translation error';
    const errorContentSize = typeof content === 'object' ? Object.keys(content).length : 0;
    const batchingUsed = TRANSLATION_CONFIG.batching.enabled && errorContentSize > TRANSLATION_CONFIG.batching.maxBatchSize;
    const errorDetails = {
      targetLanguage,
      languageCode,
      error: errorMessage,
      timestamp: new Date().toISOString(),
      contentLength: JSON.stringify(content).length,
      contentFields: errorContentSize,
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
      languageCode
    };
  }
};