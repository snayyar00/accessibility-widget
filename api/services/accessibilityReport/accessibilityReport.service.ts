import axios from 'axios';
import { getAccessibilityInformationPally } from '~/helpers/accessibility.helper';
import logger from '~/utils/logger';
import { GPTChunks } from './accessibilityIssues.service';
import { rest } from 'lodash';
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

    if (!url.startsWith('https://') && !url.startsWith('http://')) {
      url = 'https://' + url;
    }

    const result: ResultWithOriginal = await getAccessibilityInformationPally(url);

    const siteImg = await fetchSitePreview(url);
    if (result && siteImg) {
      result.siteImg = siteImg;
    }

    const scriptCheckResult = await checkScript(url);
    if (result && scriptCheckResult) {
      result.scriptCheckResult = scriptCheckResult;
    }

    if (result) {
      // Skip old ByFunctions processing if enhanced processing already provided ByFunctions
      if (result.ByFunctions && Array.isArray(result.ByFunctions) && result.ByFunctions.length > 0) {
        console.log('Enhanced ByFunctions already provided. Skipping legacy processing.');
      } else {
        // Legacy ByFunctions processing
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
            errorCodeWithDescriptions[errorcode?.code] = {}; // Initialize if not exist
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
            errorCodeWithDescriptions[errorcode?.code] = {}; // Initialize if not exist
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
            errorCodeWithDescriptions[errorcode?.code] = {}; // Initialize if not exist
          }
          errorCodeWithDescriptions[errorcode?.code].message = errorcode?.message;
          errorCodeWithDescriptions[errorcode?.code].context = errorcode?.context;
          errorCodeWithDescriptions[errorcode?.code].description = errorcode?.description;
          errorCodeWithDescriptions[errorcode?.code].recommended_action = errorcode?.recommended_action;
          errorCodeWithDescriptions[errorcode?.code].selectors = errorcode?.selectors;
        });

        const completion: GPTData = await GPTChunks(errorCodes);

        if (completion) {
          completion.HumanFunctionalities.forEach((functionality: HumanFunctionality) => {
            functionality.Errors.forEach((error: Error) => {
              let errorCode =
                error['ErrorGuideline'] ||
                (error as any)['Error Guideline'] ||
                (error as any)['code'] ||
                (error as any)['Error Code'] ||
                (error as any)['guideline'];

              if (!errorCode) {
                const possibleCode = Object.values(error).find(
                  (value: any) => typeof value === 'string' && value.includes('WCAG')
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

                error.description =
                  enhancedDescription || 'Accessibility issue detected. Please review this element for compliance.';
                error.message = error.message || 'Accessibility compliance issue';
                error.recommended_action =
                  error.recommended_action || 'Review and fix this accessibility issue according to WCAG guidelines.';
                error.context = error.context || [];
                error.selectors = error.selectors || [];
              }
            });
          });

          result.ByFunctions = completion.HumanFunctionalities;
        }
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
    }

    return result; // Return the final result with all fields
  } catch (error) {
    console.error(error);
    throw new Error(`${error} Error fetching data from WebAIM API`);
  }
};


export const fetchSitePreview = async (url: string): Promise<string | null> => {
  try {
    const apiUrl = `${process.env.SECONDARY_SERVER_URL}/screenshot/?url=${url}`;
    console.log(`Fetching screenshot from: ${apiUrl}`);
    const response = await fetch(apiUrl);

    if (!response.ok) {
      console.error(`Failed to fetch screenshot for ${url}. Status: ${response.status}`);
      return null;
    }

    const buffer = await response.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString('base64');
    return `data:image/png;base64,${base64Image}`;
  } catch (error) {
    console.error(`Error generating screenshot for ${url}:`, error);
    return null;
  }
};

const checkScript = async (url: string): Promise<string> => {
  try {
    //console.log(`Checking script for URL: ${url}`);
    // Construct the API URL for the secondary server
    const apiUrl = `${process.env.SECONDARY_SERVER_URL}/checkscript/?url=${url}`;

    // Fetch the data from the secondary server
    const response = await fetch(apiUrl);

    // Check if the response is successful
    if (!response.ok) {
      throw new Error(`Failed to fetch the script check. Status: ${response.status}`);
    }

    // Parse the response as JSON
    const responseData = await response.json();

    // Access the result and return accordingly
    if (responseData.result === "WebAbility") {
      return "Web Ability";
    } else if (responseData.result !== "Not Found") {
      return "true";
    } else {
      return "false";
    }
  } catch (error) {
    // Handle any errors that occur
    console.error("Error in checkScript:", error.message);
    return "Error";
  }
};

function extractIssuesFromReport(report: any) {
  const issues: any[] = []

  // Check if we have the new data structure with top-level ByFunctions
  if (report?.ByFunctions && Array.isArray(report.ByFunctions)) {
    report.ByFunctions.forEach((funcGroup: { FunctionalityName: any; Errors: any[]; }) => {
      if (funcGroup.FunctionalityName && Array.isArray(funcGroup.Errors)) {
        funcGroup.Errors.forEach(error => {
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
        funcGroup.Errors.forEach(error => {
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

  return issues;
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

function countIssuesBySeverity(issues: any[]) {
  const counts = { criticalIssues: 0, warnings: 0, moderateIssues: 0, totalIssues: issues.length };

  issues.forEach((issue) => {
    if (issue.impact === 'critical') counts.criticalIssues++;
    else if (issue.impact === 'serious') counts.warnings++;
    else counts.moderateIssues++;
  });

  return counts;
}

function groupIssuesByFunctionality(issues: any[]) {
  const groupedIssues: any = {};

  issues.forEach((issue) => {
    if (issue.functionality) {
      const normalizedName = issue.functionality
        .split(' ')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

      if (!groupedIssues[normalizedName]) {
        groupedIssues[normalizedName] = [];
      }

      groupedIssues[normalizedName].push(issue);
    }
  });

  return groupedIssues;
}

function getFunctionalityNames(issuesByFunction: any) {
  return Object.keys(issuesByFunction).sort();
}

function calculateTotalStats(report: any, issues: any[], webabilityEnabled: boolean) {
  const severityCounts = countIssuesBySeverity(issues);
  const baseScore = report?.score || 0;
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