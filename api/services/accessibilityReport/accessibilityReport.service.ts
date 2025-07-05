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
  code: string;
  message?: string;
  context?: string[];
  selectors?: string[];
  description?:string;
  recommended_action?:string;
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
      let result: ResultWithOriginal = await getAccessibilityInformation(formattedUrl);
      
      // If initial attempt fails, try variations
      if (!result) {
        const retryUrls = getRetryUrls(sanitizedUrl);
        for (const retryUrl of retryUrls) {
          try {
            result = await getAccessibilityInformation(retryUrl);
            if (result) break;
          } catch (retryError) {
            console.error(`Error with retry URL ${retryUrl}:`, retryError.message);
          }
        }
      }

      // If all attempts fail, throw error
      if (!result) {
        throw new Error('Failed to fetch accessibility report for all URL variations');
      }

      console.log('📊 result from getAccessibilityInformationPally:', {
        score: result.score,
        totalElements: result.totalElements,
        hasByFunctions: !!result.ByFunctions,
        ByFunctionsLength: result.ByFunctions?.length || 0
      });
      const siteImg = await fetchSitePreview(formattedUrl);
      if (result && siteImg) {
        result.siteImg = siteImg;
      }

      const scriptCheckResult = await checkScript(url);
      if (result && scriptCheckResult) {
        result.scriptCheckResult = scriptCheckResult;
      }

      // Perform calculations after the block
      const issues = extractIssuesFromReport(result);
      console.log(`Extracted ${issues.length} issues from report.`);

      const issuesByFunction = groupIssuesByFunctionality(issues);
      const functionalityNames = getFunctionalityNames(issuesByFunction);

      const webabilityEnabled = scriptCheckResult === 'Web Ability';
      const totalStats = calculateTotalStats(result, issues, webabilityEnabled);

      // Add calculated fields to the result
      result.issues = issues;
      result.issuesByFunction = issuesByFunction;
      result.functionalityNames = functionalityNames;
      result.totalStats = totalStats;

      if (result) {
        if (result.ByFunctions && Array.isArray(result.ByFunctions) && result.ByFunctions.length > 0) {
          // Check if this is a scan error with helpful messaging
          if (result.processing_stats?.scan_error) {
            console.log('🔧 Returning scan error information:', result.processing_stats.scan_error);
            return result;
          }
          console.log('✅ ByFunctions data found, returning early with length:', result.ByFunctions.length);
          return result;
        }
        
        console.log('⚠️  ByFunctions is missing or empty, processing with GPT...');

        const guideErrors: {
          errors: htmlcsOutput[];
          notices: htmlcsOutput[];
          warnings: htmlcsOutput[];
        } = result?._originalHtmlcs || result?.htmlcs || {
          errors: [],
          notices: [],
          warnings: []
        };

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
          completion.HumanFunctionalities.forEach(
            (functionality: HumanFunctionality) => {
              console.log('📋 Processing functionality:', functionality.FunctionalityName, 'with', functionality.Errors?.length || 0, 'errors');
              functionality.Errors.forEach((error: Error) => {
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

                if (errorCode && errorCodeWithDescriptions[errorCode]) {
                  error.description = errorCodeWithDescriptions[errorCode]?.description;
                  error.context = errorCodeWithDescriptions[errorCode]?.context;
                  error.message = errorCodeWithDescriptions[errorCode]?.message;
                  error.recommended_action = errorCodeWithDescriptions[errorCode]?.recommended_action;
                  error.selectors = errorCodeWithDescriptions[errorCode]?.selectors;
                } else {
                  let enhancedDescription = null;
                  if (result?.htmlcs?.errors) {
                    const enhancedError = result.htmlcs.errors.find((e: any) => e.code === errorCode);
                    if (enhancedError) {
                      enhancedDescription = enhancedError.description;
                      error.message = enhancedError.message;
                      error.recommended_action = enhancedError.recommended_action;
                      error.context = enhancedError.context || [];
                      error.selectors = enhancedError.selectors || [];
                    }
                  }

                  error.description = enhancedDescription || "Accessibility issue detected. Please review this element for compliance.";
                  error.message = error.message || "Accessibility compliance issue";
                  error.recommended_action = error.recommended_action || "Review and fix this accessibility issue according to WCAG guidelines.";
                  error.context = error.context || [];
                  error.selectors = error.selectors || [];
                }
              });
            },
          );

          result.ByFunctions = completion.HumanFunctionalities;
          console.log('✅ Final ByFunctions assigned with', result.ByFunctions.length, 'functionalities');
          
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
      }

      // Final safety check: Ensure all required array fields are initialized before returning
      if (!result.axe) result.axe = { errors: [], notices: [], warnings: [] };
      if (!Array.isArray(result.axe.errors)) result.axe.errors = [];
      if (!Array.isArray(result.axe.notices)) result.axe.notices = [];
      if (!Array.isArray(result.axe.warnings)) result.axe.warnings = [];
      
      if (!result.htmlcs) result.htmlcs = { errors: [], notices: [], warnings: [] };
      if (!Array.isArray(result.htmlcs.errors)) result.htmlcs.errors = [];
      if (!Array.isArray(result.htmlcs.notices)) result.htmlcs.notices = [];
      if (!Array.isArray(result.htmlcs.warnings)) result.htmlcs.warnings = [];
      
      if (!Array.isArray(result.ByFunctions)) result.ByFunctions = [];

      return result;
    } catch (error) {
      console.error(`Error with https://www.: ${error.message}`);
      try {
        if (!url.startsWith('https://') && !url.startsWith('http://')) {
          url = 'https://' + url.replace('https://www.', '').replace('http://www.', '');
        }

        const result: ResultWithOriginal = await getAccessibilityInformation(url);
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