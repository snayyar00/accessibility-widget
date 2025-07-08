import { getAccessibilityInformationPally } from '~/helpers/accessibility.helper';
import { getAccessibilityInformation } from '~/helpers/accessibility-adapter.helper';
import logger from '~/utils/logger';
import { GPTChunks } from './accessibilityIssues.service';
import { formatUrlForScan, getRetryUrls, sanitizeUrl, isValidScanDomain } from '~/utils/domain.utils';

const { GraphQLJSON } = require('graphql-type-json');


interface Status {
  success: boolean;
  httpstatuscode: number;
}

interface Statistics {
  pagetitle: string;
  pageurl: string;
  time: number;
  creditsremaining: number;
  allitemcount: number;
  totalelements: number;
  waveurl: string;
}

interface CategoryItem {
  id: string;
  description: string;
  count: number;
  xpaths?: string[];
  contrastdata?: (number | string | boolean)[][];
  selectors?: string[];
}

// interface Category {
//     description: string;
//     count: number;
//     items?: { [key: string]: CategoryItem };
// }

interface Status {
  success: boolean;
  httpstatuscode: number;
}
  
interface Statistics {
  pagetitle: string;
  pageurl: string;
  time: number;
  creditsremaining: number;
  allitemcount: number;
  totalelements: number;
  waveurl: string;
}
  
interface CategoryItem {
  id: string;
  description: string;
  count: number;
  xpaths?: string[];
  contrastdata?: (number | string | boolean)[][];
  selectors?: string[];
}
  
// Use an index signature for the items within a category
interface Category {
  description: string;
  count: number;
  items: { [key: string]: CategoryItem };
}
  
// Use an index signature for the categories themselves
interface Categories {
  [key: string]: Category;
}
  
interface WebAIMResponse {
  status: Status;
  statistics: Statistics;
  categories: Categories;
}
  

interface WebAIMResponse {
  status: Status;
  statistics: Statistics;
  categories: { [key: string]: Category };
}

interface Error {
  'ErrorGuideline'?: string;
  code?: string;
  description?: string | string[];
  message?: string | string[];
  context?: string | string[];
  recommended_action?: string | string[];
  selectors?: string | string[];
}

interface HumanFunctionality {
  'FunctionalityName': string;
  Errors: Error[];
}

interface GPTData {
  'HumanFunctionalities': HumanFunctionality[];
}

function calculateAccessibilityScore(data: any) {
  const weights = {
    'error': 1, // High severity
    'contrast': 0.75, // Medium severity
    'alert': 0.5, // Low severity
  };

  const defaultWeight = 0.35;
  let issueSum = 0;
  let totalIssues = 0;

  for (const category in data.categories) {
    if (data.categories.hasOwnProperty(category)) {
      const categoryData = data.categories[category];
      const weight = weights[category as keyof typeof weights] || defaultWeight;
      issueSum += categoryData.count * weight;
      totalIssues += categoryData.count;
    }
  }

  const maxScore = 100;
  const score = Math.ceil( maxScore - issueSum);
  return {
    score: Math.max(30, score), // Ensure score doesn't go below 0
    totalIssues: totalIssues,
  };
}
interface htmlcsOutput {
  id?: string;
  code: string;
  message?: string;
  context?: string[];
  selectors?: string[];
  description?: string;
  recommended_action?: string;
  screenshotUrl?: string;
  helpUrl?: string;
  runner?: string;
  impact?: string;
  wcagLevel?: string;
}

interface ResultWithOriginal {
  axe?: any;
  htmlcs?: any;
  score?: number;
  totalElements?: number;
  siteImg?: string;
  ByFunctions?: any[];
  processing_stats?: any;
  _originalHtmlcs?: {
    errors: htmlcsOutput[];
    notices: htmlcsOutput[];
    warnings: htmlcsOutput[];
  };
  scriptCheckResult?: string;
  issues?: any[]; // Array of extracted issues
  issuesByFunction?: { [key: string]: any[] }; // Grouped issues by functionality
  functionalityNames?: string[]; // List of functionality names
  totalStats?: {
    score: number;
    originalScore: number;
    criticalIssues: number;
    warnings: number;
    moderateIssues: number;
    totalElements: number;
    hasWebAbility: boolean;
  }; // Aggregated statistics
}

export const fetchAccessibilityReport = async (url: string) => {
  try {
    if (!url || typeof url !== 'string' || url.trim() === '') {
      console.error('Invalid URL passed to fetchAccessibilityReport:', url);
      throw new Error('Invalid URL provided to fetchAccessibilityReport');
    }

    // Decode URL if it's encoded
    let decodedUrl = url;
    try {
      // Try to decode in case it's encoded
      decodedUrl = decodeURIComponent(url);
    } catch (e) {
      // If decode fails, use original URL
      decodedUrl = url;
    }

    // Sanitize and validate the URL for security
    let sanitizedUrl: string;
    try {
      sanitizedUrl = sanitizeUrl(decodedUrl);
      
      // Additional validation for scan safety
      if (!isValidScanDomain(sanitizedUrl)) {
        throw new Error('Domain validation failed - URL may be malicious or malformed');
      }
    } catch (error: any) {
      console.error('URL sanitization failed:', error.message);
      throw new Error(`Invalid URL: ${error.message}`);
    }

    try {
      // Format URL with www prefix for initial scan using sanitized URL
      const formattedUrl = formatUrlForScan(sanitizedUrl);
      console.log('Formatted URL for scan:', formattedUrl);
      
      // Start all operations in parallel for better performance
      console.log('🚀 Starting parallel operations: accessibility scan, screenshot, and script check');
      const [scanResult, siteImgResult, scriptCheckResult] = await Promise.allSettled([
        // Main accessibility scan with fallback logic
        (async () => {
          let accessibilityData: ResultWithOriginal = await getAccessibilityInformation(formattedUrl);
          
          // If initial attempt fails, try variations
          if (!accessibilityData) {
            const retryUrls = getRetryUrls(sanitizedUrl);
            for (const retryUrl of retryUrls) {
              try {
                accessibilityData = await getAccessibilityInformation(retryUrl);
                if (accessibilityData) break;
              } catch (retryError) {
                console.error(`Error with retry URL ${retryUrl}:`, retryError.message);
              }
            }
          }
          
          if (!accessibilityData) {
            throw new Error('Failed to fetch accessibility report for all URL variations');
          }
          
          return accessibilityData;
        })(),
        
        // Screenshot fetching in parallel
        fetchSitePreview(formattedUrl),
        
        // Script checking in parallel
        checkScript(url)
      ]);

      // Handle accessibility scan result
      if (scanResult.status === 'rejected') {
        throw scanResult.reason;
      }
      let result = scanResult.value;

      console.log('📊 result from getAccessibilityInformation:', {
        score: result.score,
        totalElements: result.totalElements,
        hasByFunctions: !!result.ByFunctions,
        ByFunctionsLength: result.ByFunctions?.length || 0
      });

      // Handle screenshot result
      if (siteImgResult.status === 'fulfilled' && siteImgResult.value) {
        result.siteImg = siteImgResult.value;
        console.log('📸 Screenshot fetched successfully in parallel');
      } else if (siteImgResult.status === 'rejected') {
        console.log('📸 Screenshot fetch failed (parallel):', siteImgResult.reason?.message || 'Unknown error');
      }

      // Handle script check result
      if (scriptCheckResult.status === 'fulfilled' && scriptCheckResult.value) {
        result.scriptCheckResult = scriptCheckResult.value;
        console.log('🔍 Script check completed successfully in parallel');
      } else if (scriptCheckResult.status === 'rejected') {
        console.log('🔍 Script check failed (parallel):', scriptCheckResult.reason?.message || 'Unknown error');
      }

      if (result) {
        // Perform calculations for all results (regardless of ByFunctions presence)
        const issues = extractIssuesFromReport(result);
        console.log(`Extracted ${issues.length} issues from report.`);

        const issuesByFunction = groupIssuesByFunctionality(issues);
        const functionalityNames = getFunctionalityNames(issuesByFunction);

        const webabilityEnabled = result.scriptCheckResult === 'Web Ability';
        const totalStats = calculateTotalStats(result, issues, webabilityEnabled);

        // Add calculated fields to the result
        result.issues = issues;
        result.issuesByFunction = issuesByFunction;
        result.functionalityNames = functionalityNames;
        result.totalStats = totalStats;

        console.log('📊 Added calculated fields:', {
          issuesLength: issues.length,
          functionalityNamesLength: functionalityNames.length,
          totalStatsKeys: Object.keys(totalStats)
        });

        if (result.ByFunctions && Array.isArray(result.ByFunctions) && result.ByFunctions.length > 0) {
          // Check if this is a scan error with helpful messaging
          if (result.processing_stats?.scan_error) {
            console.log('🔧 Returning scan error information:', result.processing_stats.scan_error);
            return result;
          }
          
          // Check if this is a WebAbility result - no GPT processing needed since it already has rich descriptions
          if (result.processing_stats?.scanner_type === 'webability') {
            console.log('✅ WebAbility result detected with rich descriptions, skipping GPT processing to preserve data integrity');
            return result;
          } else {
            console.log('✅ Pally ByFunctions data found, returning with calculated fields. Length:', result.ByFunctions.length);
            return result;
          }
        }
        
        // Determine if we need GPT processing
        const needsGptProcessing = !result.ByFunctions || 
                                   !Array.isArray(result.ByFunctions) || 
                                   result.ByFunctions.length === 0 ||
                                   result.processing_stats?.scanner_type === 'webability';

        if (needsGptProcessing) {
          console.log('🤖 Processing with GPT for consistent format...', {
            hasExistingByFunctions: !!(result.ByFunctions && result.ByFunctions.length > 0),
            scannerType: result.processing_stats?.scanner_type,
            reason: result.processing_stats?.scanner_type === 'webability' ? 'WebAbility format standardization' : 'Missing ByFunctions'
          });

          // Preserve enhanced data BEFORE GPT processing - store by sequential index
          const preservedEnhancedData: any[] = [];
          
          // For WebAbility, use both axe and htmlcs data for comprehensive GPT processing
          const guideErrors: {
            errors: htmlcsOutput[];
            notices: htmlcsOutput[];
            warnings: htmlcsOutput[];
          } = result?._originalHtmlcs || result?.htmlcs || {
            errors: [],
            notices: [],
            warnings: []
          };
          
          // Store enhanced data in order they will be processed
          const preserveDataInOrder = (errors: htmlcsOutput[]) => {
            errors.forEach((error) => {
              preservedEnhancedData.push({
                selectors: error.selectors || [],
                context: error.context || [],
                screenshotUrl: (error as any).screenshotUrl,
                helpUrl: (error as any).helpUrl,
                runner: (error as any).runner,
                impact: (error as any).impact,
                wcagLevel: (error as any).wcagLevel,
                code: error.code,
                description: error.description,
                recommended_action: error.recommended_action,
                originalMessage: error.message
              });
            });
          };
          
          // Store all enhanced data in the same order as errorCodes array
          if (guideErrors.errors) preserveDataInOrder(guideErrors.errors);
          if (guideErrors.notices) preserveDataInOrder(guideErrors.notices);
          if (guideErrors.warnings) preserveDataInOrder(guideErrors.warnings);
          
          // For WebAbility scans, also preserve axe data (where most enhanced data is)
          if (result.processing_stats?.scanner_type === 'webability' && result.axe) {
            console.log('🔄 Also preserving axe data for WebAbility scan');
            
            // Convert axe format to htmlcs format for preservation
            const convertAxeToHtmlcs = (axeArray: any[]): htmlcsOutput[] => {
              return axeArray.map(axeItem => ({
                id: axeItem.id,
                code: axeItem.code || 'AXE_ERROR',
                message: axeItem.message || '',
                selectors: axeItem.selectors || [],
                context: axeItem.context || [],
                screenshotUrl: axeItem.screenshotUrl,
                helpUrl: axeItem.helpUrl,
                runner: axeItem.runner,
                impact: axeItem.impact,
                wcagLevel: axeItem.wcagLevel,
                description: axeItem.description,
                recommended_action: axeItem.help
              }));
            };
            
            if (result.axe.errors) preserveDataInOrder(convertAxeToHtmlcs(result.axe.errors));
            if (result.axe.warnings) preserveDataInOrder(convertAxeToHtmlcs(result.axe.warnings));
            if (result.axe.notices) preserveDataInOrder(convertAxeToHtmlcs(result.axe.notices));
          }
          
          console.log('💾 Preserved enhanced data for', preservedEnhancedData.length, 'errors before GPT processing');

          // Add axe errors to GPT processing for WebAbility results
          if (result.processing_stats?.scanner_type === 'webability' && result.axe) {
            console.log('🔄 Adding axe data to GPT processing for WebAbility');
            
            // Convert axe errors to htmlcs format for GPT processing
            if (result.axe.errors) {
              result.axe.errors.forEach((axeError: any) => {
                guideErrors.errors.push({
                  code: axeError.code || 'AXE_ERROR',
                  message: axeError.message,
                  context: axeError.context || [],
                  selectors: axeError.selectors || [],
                  description: axeError.description,
                  recommended_action: axeError.help || 'Please review this accessibility issue',
                  // Preserve screenshot URL from WebAbility for this specific issue
                  screenshotUrl: axeError.screenshotUrl
                });
              });
            }
            
            if (result.axe.warnings) {
              result.axe.warnings.forEach((axeWarning: any) => {
                guideErrors.warnings.push({
                  code: axeWarning.code || 'AXE_WARNING',
                  message: axeWarning.message,
                  context: axeWarning.context || [],
                  selectors: axeWarning.selectors || [],
                  description: axeWarning.description,
                  recommended_action: axeWarning.help || 'Please review this accessibility issue',
                  screenshotUrl: axeWarning.screenshotUrl
                });
              });
            }
            
            if (result.axe.notices) {
              result.axe.notices.forEach((axeNotice: any) => {
                guideErrors.notices.push({
                  code: axeNotice.code || 'AXE_NOTICE',
                  message: axeNotice.message,
                  context: axeNotice.context || [],
                  selectors: axeNotice.selectors || [],
                  description: axeNotice.description,
                  recommended_action: axeNotice.help || 'Please review this accessibility issue',
                  screenshotUrl: axeNotice.screenshotUrl
                });
              });
            }
          }

          const errorCodes: string[] = [];
          const errorCodeWithDescriptions: { [key: string]: { [key: string]: string | string[] } } = {};

          // Ensure arrays exist before iterating
          if (guideErrors.errors && Array.isArray(guideErrors.errors)) {
            guideErrors.errors.forEach((errorcode: htmlcsOutput) => {
              errorCodes.push(errorcode?.code);
              if (!errorCodeWithDescriptions[errorcode?.code]) {
                errorCodeWithDescriptions[errorcode?.code] = {};
              }
              errorCodeWithDescriptions[errorcode?.code].message = errorcode?.message;
              errorCodeWithDescriptions[errorcode?.code].context = errorcode?.context;
              errorCodeWithDescriptions[errorcode?.code].description = errorcode?.description;
              errorCodeWithDescriptions[errorcode?.code].recommended_action = errorcode?.recommended_action;
              errorCodeWithDescriptions[errorcode?.code].selectors = errorcode?.selectors;
              // Preserve WebAbility screenshot URLs for frontend display
              if ((errorcode as any)?.screenshotUrl) {
                errorCodeWithDescriptions[errorcode?.code].screenshotUrl = (errorcode as any).screenshotUrl;
                console.log('📸 Preserved screenshot URL for error:', errorcode?.code, 'URL:', (errorcode as any).screenshotUrl.substring(0, 50) + '...');
              }
            });
          }

          if (guideErrors.notices && Array.isArray(guideErrors.notices)) {
            guideErrors.notices.forEach((errorcode: htmlcsOutput) => {
              errorCodes.push(errorcode?.code);
              if (!errorCodeWithDescriptions[errorcode?.code]) {
                errorCodeWithDescriptions[errorcode?.code] = {};
              }
              errorCodeWithDescriptions[errorcode?.code].message = errorcode?.message;
              errorCodeWithDescriptions[errorcode?.code].context = errorcode?.context;
              errorCodeWithDescriptions[errorcode?.code].description = errorcode?.description;
              errorCodeWithDescriptions[errorcode?.code].recommended_action = errorcode?.recommended_action;
              errorCodeWithDescriptions[errorcode?.code].selectors = errorcode?.selectors;
            });
          }

          if (guideErrors.warnings && Array.isArray(guideErrors.warnings)) {
            guideErrors.warnings.forEach((errorcode: htmlcsOutput) => {
              errorCodes.push(errorcode?.code);
              if (!errorCodeWithDescriptions[errorcode?.code]) {
                errorCodeWithDescriptions[errorcode?.code] = {};
              }
              errorCodeWithDescriptions[errorcode?.code].message = errorcode?.message;
              errorCodeWithDescriptions[errorcode?.code].context = errorcode?.context;
              errorCodeWithDescriptions[errorcode?.code].description = errorcode?.description;
              errorCodeWithDescriptions[errorcode?.code].recommended_action = errorcode?.recommended_action;
              errorCodeWithDescriptions[errorcode?.code].selectors = errorcode?.selectors;
            });
          }

          console.log('🤖 Calling GPT with', errorCodes.length, 'error codes');
          const completion: GPTData = await GPTChunks(errorCodes);

          if (completion) {
            console.log('✅ GPT returned completion with', completion.HumanFunctionalities?.length || 0, 'functionalities');
            
            // Track global error index across all functionalities for preserved data mapping
            let globalErrorIndex = 0;
            
            completion.HumanFunctionalities.forEach(
              (functionality: HumanFunctionality) => {
                console.log('📋 Processing functionality:', functionality.FunctionalityName, 'with', functionality.Errors?.length || 0, 'errors');
                functionality.Errors.forEach((error: Error, localErrorIndex: number) => {
                  let errorCode = error['ErrorGuideline'] || (error as any)['Error Guideline'] || (error as any)['code'] || (error as any)['Error Code'] || (error as any)['guideline'];

                  if (!errorCode) {
                    const possibleCode = Object.values(error).find((value: any) => 
                      typeof value === 'string' && value.includes('WCAG')
                    );
                    errorCode = possibleCode;
                  }

                  error.code = errorCode;
                  delete error['ErrorGuideline'];
                  delete (error as any)['Error Guideline'];

                  // Try to restore enhanced data from preserved array by global index
                  const enhancedData = preservedEnhancedData[globalErrorIndex];
                  
                  if (enhancedData) {
                    // Restore all preserved enhanced data
                    error.selectors = enhancedData.selectors || [];
                    error.context = enhancedData.context || [];
                    error.description = enhancedData.description || error.description;
                    error.recommended_action = enhancedData.recommended_action || error.recommended_action;
                    
                    // Add WebAbility enhanced fields
                    if (enhancedData.screenshotUrl) {
                      (error as any).screenshotUrl = enhancedData.screenshotUrl;
                      console.log('📸 Restored screenshot URL for error', globalErrorIndex, ':', String(error.message).substring(0, 50));
                    }
                    if (enhancedData.helpUrl) {
                      (error as any).helpUrl = enhancedData.helpUrl;
                    }
                    if (enhancedData.runner) {
                      (error as any).runner = enhancedData.runner;
                    }
                    if (enhancedData.impact) {
                      (error as any).impact = enhancedData.impact;
                    }
                    if (enhancedData.wcagLevel) {
                      (error as any).wcagLevel = enhancedData.wcagLevel;
                    }
                    
                    console.log('🔗 Restored enhanced data for error', globalErrorIndex, ':', {
                      originalMessage: enhancedData.originalMessage,
                      newMessage: error.message,
                      hasSelectors: !!(error.selectors && error.selectors.length > 0),
                      selectorsCount: error.selectors?.length || 0,
                      selectorsContent: error.selectors,
                      hasScreenshot: !!(error as any).screenshotUrl,
                      hasContext: !!(error.context && error.context.length > 0)
                    });
                  }
                  // Fallback to old logic if no preserved data found
                  else if (errorCode && errorCodeWithDescriptions[errorCode]) {
                    error.description = errorCodeWithDescriptions[errorCode]?.description;
                    error.context = errorCodeWithDescriptions[errorCode]?.context;
                    error.message = errorCodeWithDescriptions[errorCode]?.message;
                    error.recommended_action = errorCodeWithDescriptions[errorCode]?.recommended_action;
                    error.selectors = errorCodeWithDescriptions[errorCode]?.selectors;
                    // Add screenshot URL for frontend display
                    if (errorCodeWithDescriptions[errorCode]?.screenshotUrl) {
                      (error as any).screenshotUrl = errorCodeWithDescriptions[errorCode].screenshotUrl;
                      console.log('📸 Added screenshot URL to GPT result for:', errorCode);
                    }
                  }
                  
                  // If no enhanced data found, try fallback logic
                  else {
                    let enhancedDescription = null;
                    if (result?.htmlcs?.errors) {
                      const enhancedError = result.htmlcs.errors.find((e: any) => e.code === errorCode);
                      if (enhancedError) {
                        enhancedDescription = enhancedError.description;
                        error.message = enhancedError.message;
                        error.recommended_action = enhancedError.recommended_action;
                        error.context = enhancedError.context || [];
                        error.selectors = enhancedError.selectors || [];
                        // Preserve WebAbility metadata even when not in errorCodeWithDescriptions
                        if (enhancedError.screenshotUrl) {
                          (error as any).screenshotUrl = enhancedError.screenshotUrl;
                          console.log('📸 Added screenshot URL from htmlcs enhanced error for:', errorCode);
                        }
                        if (enhancedError.helpUrl) {
                          (error as any).helpUrl = enhancedError.helpUrl;
                        }
                        if (enhancedError.runner) {
                          (error as any).runner = enhancedError.runner;
                        }
                        if (enhancedError.impact) {
                          (error as any).impact = enhancedError.impact;
                        }
                        if (enhancedError.wcagLevel) {
                          (error as any).wcagLevel = enhancedError.wcagLevel;
                        }
                      }
                    }

                    error.description = enhancedDescription || "Accessibility issue detected. Please review this element for compliance.";
                    error.message = error.message || "Accessibility compliance issue";
                    error.recommended_action = error.recommended_action || "Review and fix this accessibility issue according to WCAG guidelines.";
                    error.context = error.context || [];
                    error.selectors = error.selectors || [];
                    
                    console.log('🔗 Final fallback error data for', errorCode, {
                      hasSelectors: !!(error.selectors && error.selectors.length > 0),
                      hasContext: !!(error.context && error.context.length > 0),
                      hasScreenshot: !!(error as any).screenshotUrl,
                      selectorsCount: error.selectors?.length || 0,
                      contextCount: error.context?.length || 0
                    });
                  }
                  
                  // Increment global error index for next error
                  globalErrorIndex++;
                });
              },
            );

            result.ByFunctions = completion.HumanFunctionalities;
            console.log('✅ Final ByFunctions assigned with', result.ByFunctions.length, 'functionalities');
            
            // Count screenshots in final ByFunctions
            let totalScreenshotsInByFunctions = 0;
            result.ByFunctions.forEach((func: any, funcIndex: number) => {
              let screenshotsInFunc = 0;
              func.Errors.forEach((error: any, errorIndex: number) => {
                if ((error as any).screenshotUrl) {
                  screenshotsInFunc++;
                  totalScreenshotsInByFunctions++;
                }
              });
              if (screenshotsInFunc > 0) {
                console.log(`📸 Function "${func.FunctionalityName}" has ${screenshotsInFunc} errors with screenshots`);
              }
            });
            console.log(`📸 Total screenshots in final ByFunctions: ${totalScreenshotsInByFunctions}`);
            
            // Preserve WebAbility metadata if available
            if (result.processing_stats?.scanner_type === 'webability') {
              console.log('📊 Preserving WebAbility metadata in final result');
              // The webability_metadata should already be in the result from the adapter
            }
            
            // Ensure all array fields are properly initialized for GraphQL
            if (!result.axe) result.axe = { errors: [], notices: [], warnings: [] };
            if (!result.axe.errors) result.axe.errors = [];
            if (!result.axe.notices) result.axe.notices = [];
            if (!result.axe.warnings) result.axe.warnings = [];
            
            if (!result.htmlcs) result.htmlcs = { errors: [], notices: [], warnings: [] };
            if (!result.htmlcs.errors) result.htmlcs.errors = [];
            if (!result.htmlcs.notices) result.htmlcs.notices = [];
            if (!result.htmlcs.warnings) result.htmlcs.warnings = [];
            
            if (!result.ByFunctions) result.ByFunctions = [];
            // Debug: Log first functionality structure to verify data integrity
            if (result.ByFunctions.length > 0) {
              const firstFunc = result.ByFunctions[0];
              console.log('🔍 First functionality structure:', {
                name: firstFunc.FunctionalityName,
                errorCount: firstFunc.Errors?.length || 0,
                hasErrors: Array.isArray(firstFunc.Errors),
                firstError: firstFunc.Errors?.[0] ? {
                  hasCode: !!firstFunc.Errors[0].code,
                  hasMessage: !!firstFunc.Errors[0].message,
                  hasDescription: !!firstFunc.Errors[0].description
                } : null
              });
            }
          } else {
            console.log('❌ GPT returned no completion');
          }
        } else {
          console.log('✅ Pally ByFunctions data found, returning with calculated fields. Length:', result.ByFunctions.length);
          return result;
        }

        }

      return result;
    } catch (error) {
      console.error(`Error with https://www.: ${error.message}`);
      try {
        let retryUrl = sanitizedUrl;
        if (!retryUrl.startsWith('https://') && !retryUrl.startsWith('http://')) {
          retryUrl = 'https://' + retryUrl.replace('https://www.', '').replace('http://www.', '');
        }

        const result: ResultWithOriginal = await getAccessibilityInformation(retryUrl);
        console.log('result from retrying with https://:', result.score, result.totalElements, result.ByFunctions);
        return result;
      } catch (retryError) {
        console.error(`Error with https:// retry: ${retryError.message}`);
        throw new Error(`Both attempts failed: ${retryError.message}`);
      }
    }
  } catch (error: any) {
    console.error('❌ fetchAccessibilityReport error:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      url: url
    });
    throw new Error(`Error processing request: ${error.message}`);
  }
};


export const fetchSitePreview = async (url: string, retries = 3): Promise<string | null> => {
  // Sanitize URL before using
  let sanitizedUrl: string;
  try {
    sanitizedUrl = sanitizeUrl(url);
  } catch (error: any) {
    console.error('Invalid URL for screenshot:', error.message);
    return null;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const apiUrl = `${process.env.SECONDARY_SERVER_URL}/screenshot/?url=${encodeURIComponent(sanitizedUrl)}`;
      console.log(`Attempt ${attempt}: Fetching screenshot from: ${apiUrl}`);
      
      // Set up timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(apiUrl, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`Failed to fetch screenshot for ${url}. Status: ${response.status}`);
        if (attempt === retries) return null;
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        continue;
      }

      const buffer = await response.arrayBuffer();
      const base64Image = Buffer.from(buffer).toString('base64');
      return `data:image/png;base64,${base64Image}`;
    } catch (error) {
      console.error(`Error generating screenshot for ${url} (attempt ${attempt}):`, error);
      if (attempt === retries) return null;
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, attempt * 1000));
    }
  }
  return null;
};

const checkScript = async (url: string, retries = 3): Promise<string> => {
  // Sanitize URL before using
  let sanitizedUrl: string;
  try {
    sanitizedUrl = sanitizeUrl(url);
  } catch (error: any) {
    console.error('Invalid URL for script check:', error.message);
    return 'Error';
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const apiUrl = `${process.env.SECONDARY_SERVER_URL}/checkscript/?url=${encodeURIComponent(sanitizedUrl)}`;

      // Set up timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(apiUrl, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`Failed to fetch script check on attempt ${attempt}. Status: ${response.status}`);
        if (attempt === retries) throw new Error(`Failed to fetch the script check. Status: ${response.status}`);
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        continue;
      }

      const responseData = await response.json();

      if (responseData.result === "WebAbility") {
        return "Web Ability";
      } else if (responseData.result !== "Not Found") {
        return "true";
      } else {
        return "false";
      }
    } catch (error) {
      console.error(`Error in checkScript attempt ${attempt}:`, error.message);
      if (attempt === retries) return "Error";
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, attempt * 1000));
    }
  }
  return "Error";
};

// Extract issues from report structure
function extractIssuesFromReport(report: ResultWithOriginal) {
  const issues: any[] = []
  
  // Check if we have the new data structure with top-level ByFunctions
  if (report?.ByFunctions && Array.isArray(report.ByFunctions)) {
    report.ByFunctions.forEach(funcGroup => {
      if (funcGroup.FunctionalityName && Array.isArray(funcGroup.Errors)) {
        funcGroup.Errors.forEach((error: { message: string; code: any; __typename: string; }) => {
          const impact = mapIssueToImpact(error.message, error.code)
          
          issues.push({
            ...error,
            impact,
            source: error.__typename === 'htmlCsOutput' ? 'HTML_CS' : 'AXE Core',
            functionality: funcGroup.FunctionalityName
          })
        })
      }
    })
  }
  
  // Try the axe structure
  if (report?.axe?.ByFunction && Array.isArray(report.axe.ByFunction)) {
    report.axe.ByFunction.forEach((funcGroup: { FunctionalityName: any; Errors: any[]; }) => {
      if (funcGroup.FunctionalityName && Array.isArray(funcGroup.Errors)) {
        funcGroup.Errors.forEach(error => {
          const impact = mapIssueToImpact(error.message, error.code)
          
          issues.push({
            ...error,
            impact,
            source: 'AXE Core',
            functionality: funcGroup.FunctionalityName
          })
        })
      }
    })
  }
  
  // Try the htmlcs structure
  if (report?.htmlcs?.ByFunction && Array.isArray(report.htmlcs.ByFunction)) {
    report.htmlcs.ByFunction.forEach((funcGroup: { FunctionalityName: any; Errors: any[]; }) => {
      if (funcGroup.FunctionalityName && Array.isArray(funcGroup.Errors)) {
        funcGroup.Errors.forEach((error: { message: string; code: any; __typename: string; }) => {
          const impact = mapIssueToImpact(error.message, error.code)
          
          issues.push({
            ...error,
            impact,
            source: 'HTML_CS',
            functionality: funcGroup.FunctionalityName
          })
        })
      }
    })
  }
  console.log(`Total issues extracted: ${issues.length}`);
  return issues
}


function mapIssueToImpact(message: string, code: any) {
  if (!message && !code) return 'moderate'
  
  const lowerMsg = (message || '').toLowerCase()
  const lowerCode = (code || '').toLowerCase()
  
  // Critical issues
  if (
    lowerMsg.includes('color contrast') || 
    lowerMsg.includes('minimum contrast') ||
    lowerCode.includes('1.4.3') ||
    (lowerMsg.includes('aria hidden') && lowerMsg.includes('focusable')) ||
    lowerMsg.includes('links must be distinguishable')
  ) {
    return 'critical'
  }
  
  // Serious issues
  if (
    lowerMsg.includes('aria attributes') ||
    lowerMsg.includes('permitted aria') ||
    lowerMsg.includes('labels or instructions') ||
    lowerMsg.includes('error identification')
  ) {
    return 'serious'
  }
  
  return 'moderate'
}

// Count issues by severity
function countIssuesBySeverity(issues: any[]) {
  // Count issues by impact
  const counts = {
    criticalIssues: 0,
    warnings: 0,
    moderateIssues: 0,
    totalIssues: issues.length
  }
  
  // Count each issue by its impact
  issues.forEach(issue => {
    if (issue.impact === 'critical') {
      counts.criticalIssues++
    } else if (issue.impact === 'serious') {
      counts.warnings++
    } else {
      counts.moderateIssues++
    }
  })
  
  return counts
}

function groupIssuesByFunctionality(issues: any[]): { [key: string]: any[] } {
  const groupedIssues: { [key: string]: any[] } = {};

  issues.forEach((issue: { functionality: string }) => {
    if (issue.functionality) {
      // Normalize functionality name to prevent duplicates like "Low Vision" and "Low vision"
      const normalizedName = issue.functionality.split(' ')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

      if (!groupedIssues[normalizedName]) {
        groupedIssues[normalizedName] = [];
      }

      // Store the issue with the normalized functionality name
      const normalizedIssue = {
        ...issue,
        functionality: normalizedName
      };
      
      groupedIssues[normalizedName].push(normalizedIssue);
    }
  });
  
  return groupedIssues;
}

function getFunctionalityNames(issuesByFunction: { [key: string]: any[] }): string[] {
  return Object.keys(issuesByFunction).sort();
}

function calculateTotalStats(report: any, issues: any[], webabilityEnabled: boolean): {
  score: number;
  originalScore: number;
  criticalIssues: number;
  warnings: number;
  moderateIssues: number;
  totalElements: number;
  hasWebAbility: boolean;
} {
  const severityCounts = countIssuesBySeverity(issues);
  const baseScore = report?.score || 0;
  console.log(`Base score: ${baseScore}, Critical: ${severityCounts.criticalIssues}, Warnings: ${severityCounts.warnings}, Moderate: ${severityCounts.moderateIssues}`);
  const enhancedScore = webabilityEnabled ? Math.min(95, baseScore + 45) : baseScore;

  return {
    score: enhancedScore,
    originalScore: baseScore,
    criticalIssues: severityCounts.criticalIssues,
    warnings: severityCounts.warnings,
    moderateIssues: severityCounts.moderateIssues,
    totalElements: report?.totalElements || 0,
    hasWebAbility: webabilityEnabled,
  };
}

// example usage:

// query GetAccessibilityReport {
//     getAccessibilityReport(url: "https://example.com") {
//       status {
//         success
//         httpstatuscode
//       }
//       statistics {
//         pagetitle
//         pageurl
//         time
//         creditsremaining
//         allitemcount
//         totalelements
//         waveurl
//       }
//       categories {
//         description
//         count
//         items {
//           id
//           description
//           count
//           xpaths
//           contrastdata
//           selectors
//         }
//       }
//     }
//   }