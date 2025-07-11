import { getAccessibilityInformationPally } from '~/helpers/accessibility.helper';
import logger from '~/utils/logger';
import { GPTChunks } from './accessibilityIssues.service';
import { formatUrlForScan, getRetryUrls } from '~/utils/domain.utils';

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
function createAxeArrayObj(message: string, issue: any) {
  const obj: axeOutput = {
    message: message,
    context: Array.isArray(issue.context) ? issue.context : [issue.context],
    selectors: Array.isArray(issue.selectors) ? issue.selectors : [issue.selectors],
    impact: issue.impact || 'moderate',
    description: issue.description || '',
    help: issue.recommended_action || '',
  };
  return obj;
}
function createHtmlcsArrayObj(issue: any) {
  const obj: htmlcsOutput = {
    code: issue.code || '',
    message: issue.message || '',
    context: Array.isArray(issue.context) ? issue.context : [issue.context],
    selectors: Array.isArray(issue.selectors) ? issue.selectors : [issue.selectors],
  };
  return obj;
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
interface axeOutput {
  message: string;
  context: string[];
  selectors: string[];
  impact: string;
  description: string;
  help: string;
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


          // Initialize output object to store merged results
 function mergeIssuesToOutput(issues: any[]): {
            axe: {
              errors: axeOutput[];
              notices: axeOutput[];
              warnings: axeOutput[];
            };
            htmlcs: {
              errors: htmlcsOutput[];
              notices: htmlcsOutput[];
              warnings: htmlcsOutput[];
            };
            totalElements: number;
          } {
            const output = {
              axe: {
                errors: [] as axeOutput[],
                notices: [] as axeOutput[],
                warnings: [] as axeOutput[]
              },
              htmlcs: {
                errors: [] as htmlcsOutput[],
                notices: [] as htmlcsOutput[],
                warnings: [] as htmlcsOutput[]
              },
              totalElements: 0
            };

            issues.forEach((issue: any) => {
              // Determine runner and type based on the actual data structure
              const runner = issue.source === 'AXE Core' ? 'axe' : 
                            issue.source === 'HTML_CS' ? 'htmlcs' : 'unknown';
              const type = issue.impact === 'critical' ? 'error' : 
                          issue.impact === 'serious' ? 'warning' : 'notice';

              if (runner === 'axe') {
                // Normalize message for comparison (remove extra whitespace and parentheses)
                const normalizedMessage = issue.message.replace(/\s*\(.*$/, '').trim();
                if (type === 'error') {
                  const errorIndex = output.axe.errors.findIndex((error:any) => error.message === normalizedMessage);
                  if (errorIndex === -1) {
                    const obj: axeOutput = createAxeArrayObj(normalizedMessage, issue);
                    output.axe.errors.push(obj);
                  } else {
                    // Append context and selectors to existing error
                    const contextToAdd = Array.isArray(issue.context) ? issue.context : [issue.context];
                    const selectorToAdd = Array.isArray(issue.selectors) ? issue.selectors : [issue.selectors];
                    output.axe.errors[errorIndex].context.push(...contextToAdd);
                    output.axe.errors[errorIndex].selectors.push(...selectorToAdd);
                  }
                } else if (type === 'notice') {
                  const noticeIndex = output.axe.notices.findIndex((notice:any) => 
                    notice.message === normalizedMessage
                  );
                  if (noticeIndex === -1) {
                    const obj: axeOutput = createAxeArrayObj(normalizedMessage, issue);
                    output.axe.notices.push(obj);
                  } else {
                    const contextToAdd = Array.isArray(issue.context) ? issue.context : [issue.context];
                    const selectorToAdd = Array.isArray(issue.selectors) ? issue.selectors : [issue.selectors];
                    output.axe.notices[noticeIndex].context.push(...contextToAdd);
                    output.axe.notices[noticeIndex].selectors.push(...selectorToAdd);
                  }
                } else if (type === 'warning') {
                  const warningIndex = output.axe.warnings.findIndex((warning:any) => 
                    warning.message === normalizedMessage
                  );
                  if (warningIndex === -1) {
                    const obj: axeOutput = createAxeArrayObj(normalizedMessage, issue);
                    output.axe.warnings.push(obj);
                  } else {
                    const contextToAdd = Array.isArray(issue.context) ? issue.context : [issue.context];
                    const selectorToAdd = Array.isArray(issue.selectors) ? issue.selectors : [issue.selectors];
                    output.axe.warnings[warningIndex].context.push(...contextToAdd);
                    output.axe.warnings[warningIndex].selectors.push(...selectorToAdd);
                  }
                }
                output.totalElements += 1;
              } else if (runner === 'htmlcs') {
                // Normalize message for comparison
                const normalizedMessage = issue.message.trim();
                if (type === 'error') {
                  const errorIndex = output.htmlcs.errors.findIndex((error:any) => error.message === normalizedMessage);
                  if (errorIndex === -1) {
                    const obj: htmlcsOutput = createHtmlcsArrayObj(issue);
                    obj.message = normalizedMessage;
                    output.htmlcs.errors.push(obj);
                  } else {
                    const contextToAdd = Array.isArray(issue.context) ? issue.context : [issue.context];
                    const selectorToAdd = Array.isArray(issue.selectors) ? issue.selectors : [issue.selectors];
                    output.htmlcs.errors[errorIndex].context.push(...contextToAdd);
                    output.htmlcs.errors[errorIndex].selectors.push(...selectorToAdd);
                  }
                } else if (type === 'notice') {
                  const noticeIndex = output.htmlcs.notices.findIndex((notice:any) => 
                    notice.message === normalizedMessage
                  );
                  if (noticeIndex === -1) {
                    const obj: htmlcsOutput = createHtmlcsArrayObj(issue);
                    obj.message = normalizedMessage;
                    output.htmlcs.notices.push(obj);
                  } else {
                    const contextToAdd = Array.isArray(issue.context) ? issue.context : [issue.context];
                    const selectorToAdd = Array.isArray(issue.selectors) ? issue.selectors : [issue.selectors];
                    output.htmlcs.notices[noticeIndex].context.push(...contextToAdd);
                    output.htmlcs.notices[noticeIndex].selectors.push(...selectorToAdd);
                  }
                } else if (type === 'warning') {
                  const warningIndex = output.htmlcs.warnings.findIndex((warning:any) => 
                    warning.message === normalizedMessage
                  );
                  if (warningIndex === -1) {
                    const obj: htmlcsOutput = createHtmlcsArrayObj(issue);
                    obj.message = normalizedMessage;
                    output.htmlcs.warnings.push(obj);
                  } else {
                    const contextToAdd = Array.isArray(issue.context) ? issue.context : [issue.context];
                    const selectorToAdd = Array.isArray(issue.selectors) ? issue.selectors : [issue.selectors];
                    output.htmlcs.warnings[warningIndex].context.push(...contextToAdd);
                    output.htmlcs.warnings[warningIndex].selectors.push(...selectorToAdd);
                  }
                }
              }
            });
            return output;
          }


          
export const fetchAccessibilityReport = async (url: string) => {
  try {
    if (!url || typeof url !== 'string' || url.trim() === '') {
      console.error('Invalid URL passed to fetchAccessibilityReport:', url);
      throw new Error('Invalid URL provided to fetchAccessibilityReport');
    }

    try {
      // Format URL with www prefix for initial scan
      const formattedUrl = formatUrlForScan(url);
      console.log('Formatted URL for scan:', formattedUrl);
      let result: ResultWithOriginal = await getAccessibilityInformationPally(formattedUrl);
      
      // If initial attempt fails, try variations
      if (!result) {
        const retryUrls = getRetryUrls(url);
        for (const retryUrl of retryUrls) {
          try {
            result = await getAccessibilityInformationPally(retryUrl);
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

      console.log('result from getAccessibilityInformationPally:', result.score, result.totalElements, result.ByFunctions);
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


          const output = mergeIssuesToOutput(result.issues);
          result.axe = output.axe;
          result.htmlcs = output.htmlcs;
          result.totalElements = output.totalElements;

          return result;

        }

        const guideErrors: {
          errors: htmlcsOutput[];
          notices: htmlcsOutput[];
          warnings: htmlcsOutput[];
        } = result?._originalHtmlcs || result?.htmlcs;

        const errorCodes: string[] = [];
        const errorCodeWithDescriptions: { [key: string]: { [key: string]: string | string[] } } = {};

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

        const completion: GPTData = await GPTChunks(errorCodes);

        if (completion) {
          completion.HumanFunctionalities.forEach(
            (functionality: HumanFunctionality) => {
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
        }
      }
      console.log("Hi i am called 1");
      const output = mergeIssuesToOutput(result.issues);
      result.axe = output.axe;
      result.htmlcs = output.htmlcs;
      result.totalElements = output.totalElements;

      return result;
    } catch (error) {
      console.error(`Error with https://www.: ${error.message}`);
      try {
        if (!url.startsWith('https://') && !url.startsWith('http://')) {
          url = 'https://' + url.replace('https://www.', '').replace('http://www.', '');
        }

        const result: ResultWithOriginal = await getAccessibilityInformationPally(url);
        console.log('result from retrying with https://:', result.score, result.totalElements, result.ByFunctions);
        console.log("Hi i am called 2");
        const output = mergeIssuesToOutput(result.issues);
        result.axe = output.axe;
        result.htmlcs = output.htmlcs;
        result.totalElements = output.totalElements;
        
        return result;
      } catch (retryError) {
        console.error(`Error with https:// retry: ${retryError.message}`);
        throw new Error(`Both attempts failed: ${retryError.message}`);
      }
    }
  } catch (error) {
    console.error(error);
    throw new Error(`${error} Error fetching data from WebAIM API`);
  }
};


export const fetchSitePreview = async (url: string, retries = 3): Promise<string | null> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const apiUrl = `${process.env.SECONDARY_SERVER_URL}/screenshot/?url=${url}`;
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
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const apiUrl = `${process.env.SECONDARY_SERVER_URL}/checkscript/?url=${url}`;

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