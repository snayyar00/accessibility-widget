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
}

export const fetchAccessibilityReport = async (url: string) => {
  try {

    if (!url.startsWith('https://') && !url.startsWith('http://')) {
      url = 'https://' + url;
    }
    
    const result: ResultWithOriginal = await getAccessibilityInformationPally(url);
      
    const siteImg = await fetchSitePreview(url);
    if (result && siteImg) {
      result.siteImg = siteImg;
    }

    if (result) {
      // Skip old ByFunctions processing if enhanced processing already provided ByFunctions
      if (result.ByFunctions && Array.isArray(result.ByFunctions) && result.ByFunctions.length > 0) {
        return result; // Return with enhanced ByFunctions
      }
      
      // Legacy ByFunctions processing (only if enhanced processing didn't provide ByFunctions)
      // Use original htmlcs data for ByFunctions processing if available (from enhanced processing)
      // This preserves the original error codes that GPTChunks expects
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
        completion.HumanFunctionalities.forEach(
          (functionality: HumanFunctionality) => {
            // Iterate over each error in the functionality
            functionality.Errors.forEach((error: Error) => {
              // Handle the field name change from 'Error Guideline' to 'ErrorGuideline'
              let errorCode = error['ErrorGuideline'] || (error as any)['Error Guideline'] || (error as any)['code'] || (error as any)['Error Code'] || (error as any)['guideline'];
              
              // If still null, try to find any field that looks like an error code
              if (!errorCode) {
                const possibleCode = Object.values(error).find((value: any) => 
                  typeof value === 'string' && value.includes('WCAG')
                );
                errorCode = possibleCode;
              }
              
              error.code = errorCode;
              delete error['ErrorGuideline'];
              delete (error as any)['Error Guideline']; // Clean up legacy field name

              // Only try to map if we have a valid error code
              if (errorCode && errorCodeWithDescriptions[errorCode]) {
                error.description = errorCodeWithDescriptions[errorCode]?.description;
                error.context = errorCodeWithDescriptions[errorCode]?.context;
                error.message = errorCodeWithDescriptions[errorCode]?.message;
                error.recommended_action = errorCodeWithDescriptions[errorCode]?.recommended_action;
                error.selectors = errorCodeWithDescriptions[errorCode]?.selectors;
              } else {
                // Try to find enhanced descriptions from result.htmlcs for this error code
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
                
                // Provide meaningful fallback values
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
        
    // Always return result - enhanced processing populates axe/htmlcs directly
    return result;

  } catch (error) {
    console.error(error);
    throw new Error(`${error} Error fetching data from WebAIM API `);
  }
};


export const fetchSitePreview = async (url: string): Promise<string | null> => {
  try {
    const apiUrl = `${process.env.SECONDARY_SERVER_URL}/screenshot/?url=${url}`;

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