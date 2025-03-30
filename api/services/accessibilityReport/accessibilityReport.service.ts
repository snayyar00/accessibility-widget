import axios from 'axios';
import { getAccessibilityInformationPally } from '~/helpers/accessibility.helper';
import logger from '~/utils/logger';
import { GPTChunks } from './accessibilityIssues.service';
import { rest } from 'lodash';
const { GraphQLJSON } = require('graphql-type-json');
import knex from '~/config/database.config';
import { findSite } from '~/services/allowedSites/allowedSites.service'
import { v4 as uuidv4 } from 'uuid';


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
  'Error Guideline'?: string;
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
      console.log(`${data.categories[category]}, ${categoryData.count}`);
      issueSum += categoryData.count * weight;
      console.log('issueSum: ', issueSum);
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

// Add this function to strip URL to domain
function stripUrlToDomain(url: string): string {
  try {
    // Remove protocol (http:// or https://)
    let domain = url.replace(/^(https?:\/\/)?(www\.)?/, '')
    // Remove everything after the first slash
    domain = domain.split('/')[0]
    return domain.toLowerCase()
  } catch (error) {
    return url
  }
}

// Add this function to get cached result
async function getCachedScanResult(domain: string, siteId: number) {
  console.log(`Checking cache for domain: ${domain}, siteId: ${siteId}`)
  
  const cachedResult = await knex('accessibility_scans')
    .where('site_id', siteId)
    .where('created_at', '>', knex.raw('NOW() - INTERVAL 7 DAY'))
    .orderBy('created_at', 'desc')
    .first()
  
  if (cachedResult) {
    console.log('Cache hit! Using cached result from:', cachedResult.created_at)
    // Parse issues only if it's a string
    const issues = typeof cachedResult.issues === 'string' 
      ? JSON.parse(cachedResult.issues) 
      : cachedResult.issues
    
    // Transform back to the expected format
    return {
      score: cachedResult.score,
      htmlcs: issues.htmlcs,
      ByFunctions: issues.byFunctions,
      siteImg: issues.siteImg
    }
  }
  
  return null
}

// Add this function to save scan result
async function saveScanResult(domain: string, result: any, siteId: number) {
  const issueCount = {
    errors: result.htmlcs?.errors?.length || 0,
    warnings: result.htmlcs?.warnings?.length || 0,
    notices: result.htmlcs?.notices?.length || 0
  }

  await knex('accessibility_scans').insert({
    site_id: siteId,
    score: result.score || 0,
    errors: issueCount.errors,
    warnings: issueCount.warnings,
    notices: issueCount.notices,
    issues: JSON.stringify({
      htmlcs: result.htmlcs,
      byFunctions: result.ByFunctions,
      siteImg: result.siteImg
    })
  })
}

// Expanded list of machine-fixable issue codes with descriptions
const MACHINE_FIXABLE_ISSUES = {
  // Images
  'WCAG2AA.Principle1.Guideline1_1.1_1_1.H37': {
    description: 'Missing alt attributes on images',
    fixType: 'alt',
    priority: 1,
    impact: 'high'
  },
  'WCAG2AA.Principle1.Guideline1_1.1_1_1.H67.1': {
    description: 'Image with empty alt text when it should be descriptive',
    fixType: 'alt',
    priority: 1,
    impact: 'high'
  },
  
  // Form labels
  'WCAG2AA.Principle1.Guideline1_3.1_3_1.H44.NonExistentFragment': {
    description: 'Missing labels on form controls',
    fixType: 'label',
    priority: 1,
    impact: 'high'
  },
  'WCAG2AA.Principle4.Guideline4_1.4_1_2.H91.InputText.Name': {
    description: 'Input field without proper label',
    fixType: 'label',
    priority: 1,
    impact: 'high'
  },
  
  // ARIA roles and labels
  'WCAG2AA.Principle1.Guideline1_3.1_3_1.ARIA6': {
    description: 'Missing ARIA labels',
    fixType: 'aria',
    priority: 2,
    impact: 'medium'
  },
  'WCAG2AA.Principle4.Guideline4_1.4_1_2.H91.Button.Name': {
    description: 'Button without text content or aria-label',
    fixType: 'button',
    priority: 1,
    impact: 'high'
  },
  
  // Links
  'WCAG2AA.Principle2.Guideline2_4.2_4_4.H77,H78,H79,H80,H81': {
    description: 'Link without descriptive text',
    fixType: 'link',
    priority: 2,
    impact: 'medium'
  },
  'WCAG2AA.Principle2.Guideline2_4.2_4_4.H77': {
    description: 'Link has no text content',
    fixType: 'link',
    priority: 1,
    impact: 'high'
  },
  
  // Document structure
  'WCAG2AA.Principle1.Guideline1_3.1_3_1.H42': {
    description: 'Heading elements not properly nested',
    fixType: 'heading',
    priority: 3,
    impact: 'medium'
  },
  'WCAG2AA.Principle3.Guideline3_1.3_1_1.H57.2': {
    description: 'Document language not specified',
    fixType: 'lang',
    priority: 1,
    impact: 'high'
  },
  
  // Tables
  'WCAG2AA.Principle1.Guideline1_3.1_3_1.H39,H73.4': {
    description: 'Table without proper headers',
    fixType: 'table',
    priority: 2,
    impact: 'medium'
  },
  
  // Color contrast
  'WCAG2AA.Principle1.Guideline1_4.1_4_3.G18.Fail': {
    description: 'Insufficient color contrast',
    fixType: 'contrast',
    priority: 2,
    impact: 'medium'
  }
};

// Define interface for issue object
interface HtmlCsIssue {
  code: string;
  message?: string;
  context?: string[];
  selectors?: string[];
  description?: string;
  recommended_action?: string;
  priority?: number;
  impact?: string;
}

interface CodeFixResult {
  original: string;
  fixed: string;
}

// Add this function to extract image URLs from HTML context
function extractImageUrl(htmlContext: string, baseUrl: string): string | null {
  try {
    const srcMatch = htmlContext.match(/src=["']([^"']+)["']/i);
    if (!srcMatch || !srcMatch[1]) return null;
    
    let imageUrl = srcMatch[1];
    
    // Handle relative URLs
    if (imageUrl.startsWith('/')) {
      // Convert domain.com/image.jpg to https://domain.com/image.jpg
      const domainMatch = baseUrl.match(/^(https?:\/\/[^\/]+)/i);
      if (domainMatch) {
        imageUrl = domainMatch[1] + imageUrl;
      } else {
        imageUrl = 'https://' + baseUrl.split('/')[0] + imageUrl;
      }
    } else if (!imageUrl.startsWith('http')) {
      // Handle relative paths without leading slash
      imageUrl = 'https://' + baseUrl + '/' + imageUrl;
    }
    
    return imageUrl;
  } catch (error) {
    console.error('Error extracting image URL:', error);
    return null;
  }
}

// Add this function to generate alt text using an image recognition API
async function generateAltText(imageUrl: string): Promise<string> {
  try {
    // Use your preferred image recognition API here
    // This is an example with a placeholder API call
    const response = await fetch(`${process.env.IMAGE_RECOGNITION_API}/analyze?url=${encodeURIComponent(imageUrl)}`);
    
    if (!response.ok) {
      throw new Error(`Image recognition API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Format the response into a concise alt text
    // This would depend on your specific API's response format
    const caption = data.description?.captions?.[0]?.text || 
                    data.description?.tags?.slice(0, 3).join(', ') || 
                    'Image';
    
    return caption.charAt(0).toUpperCase() + caption.slice(1);
  } catch (error) {
    console.error('Error generating alt text:', error);
    return 'Image description';
  }
}

// Check cache for existing fixes
async function getCachedFix(siteId: number, selector: string, elementUrl: string): Promise<string | null> {
  try {
    const scan = await knex('accessibility_scans')
      .where('site_id', siteId)
      .orderBy('created_at', 'desc')
      .first();
    
    if (!scan || !scan.generated_fixes) return null;
    
    // Parse the fixes JSON if it's a string
    const fixes = typeof scan.generated_fixes === 'string' 
      ? JSON.parse(scan.generated_fixes) 
      : scan.generated_fixes;
    
    // Create a key for the element
    const fixKey = `${selector}:${elementUrl || ''}`;
    
    return fixes[fixKey] || null;
  } catch (error) {
    console.error('Error checking fix cache:', error);
    return null;
  }
}

// Store a generated fix
async function storeFix(siteId: number, issueCode: string, selector: string, elementUrl: string, suggestedFix: string): Promise<void> {
  try {
    // Get the latest scan
    const scan = await knex('accessibility_scans')
      .where('site_id', siteId)
      .orderBy('created_at', 'desc')
      .first();
    
    if (!scan) return;
    
    // Parse existing fixes or create new object
    const fixes = scan.generated_fixes 
      ? (typeof scan.generated_fixes === 'string' 
          ? JSON.parse(scan.generated_fixes) 
          : scan.generated_fixes) 
      : {};
    
    // Create a key for the element
    const fixKey = `${selector}:${elementUrl || ''}`;
    
    // Add the new fix
    fixes[fixKey] = suggestedFix;
    
    // Update the database
    await knex('accessibility_scans')
      .where('id', scan.id)
      .update({
        generated_fixes: JSON.stringify(fixes)
      });
      
    console.log(`Stored fix for ${fixKey}: "${suggestedFix}"`);
  } catch (error) {
    console.error('Error storing fix:', error);
  }
}

// Update the generateCodeFix function to handle image recognition
async function generateCodeFix(issue: HtmlCsIssue, fixType: string, siteId: number, domain: string): Promise<CodeFixResult | null> {
  const context = issue.context?.[0] || '';
  const selector = issue.selectors?.[0] || '';
  
  switch (fixType) {
    case 'alt':
      if (context.match(/<img[^>]*>/i)) {
        const hasAlt = context.includes('alt="');
        
        // First check our cache
        const cachedFix = await getCachedFix(siteId, selector, domain);
        if (cachedFix) {
          if (!hasAlt) {
            return {
              original: context,
              fixed: context.replace(/<img/i, `<img alt="${cachedFix}"`)
            };
          } else {
            return {
              original: context,
              fixed: context.replace(/alt="[^"]*"/i, `alt="${cachedFix}"`)
            };
          }
        }
        
        // If not in cache, queue for processing
        const imageUrl = extractImageUrl(context, domain);
        if (imageUrl) {
          // Generate a placeholder fix immediately
          const placeholderId = uuidv4().substring(0, 8);
          const placeholderFix = !hasAlt 
            ? context.replace(/<img/i, `<img alt="[Loading image description ${placeholderId}]"`)
            : context.replace(/alt="[^"]*"/i, `alt="[Loading image description ${placeholderId}]"`);
          
          // Queue the image for processing - non-blocking!
          setTimeout(async () => {
            try {
              const generatedAlt = await generateAltText(imageUrl);
              
              // Store the result in our JSON column
              await storeFix(siteId, issue.code || '', selector, imageUrl, generatedAlt);
              
              console.log(`Generated alt text for ${imageUrl}: "${generatedAlt}"`);
            } catch (error) {
              console.error('Error in background alt text generation:', error);
            }
          }, 0);
          
          return {
            original: context,
            fixed: placeholderFix
          };
        }
        
        // Fallback if we can't get the image URL
        const defaultAlt = "[Descriptive text needed]";
        if (!hasAlt) {
          return {
            original: context,
            fixed: context.replace(/<img/i, `<img alt="${defaultAlt}"`)
          };
        } else {
          return {
            original: context,
            fixed: context.replace(/alt="[^"]*"/i, `alt="${defaultAlt}"`)
          };
        }
      }
      break;
      
    case 'label':
      if (context.match(/<input[^>]*>/i)) {
        const id = context.match(/id="([^"]*)"/)?.[1] || `input-${Date.now()}`;
        return {
          original: context,
          fixed: `<label for="${id}">Label text</label>\n${context.replace(/id="([^"]*)"/i, `id="${id}"`)}`
        };
      }
      break;
      
    case 'aria':
      if (!context.includes('aria-label')) {
        return {
          original: context,
          fixed: context.replace(/(<[a-z][^>]*)/i, '$1 aria-label="[Descriptive text needed]"')
        };
      }
      break;
      
    case 'button':
      if (context.match(/<button[^>]*>/i) && !context.match(/>([^<]*)</)) {
        return {
          original: context,
          fixed: context.replace(/<button([^>]*)>/i, '<button$1>Button Text</button>')
        };
      }
      break;
      
    case 'link':
      if (context.match(/<a[^>]*>/i) && !context.match(/>([^<]*)</)) {
        return {
          original: context,
          fixed: context.replace(/<a([^>]*)>/i, '<a$1>Link Text</a>')
        };
      }
      break;
      
    case 'lang':
      return {
        original: '<html>',
        fixed: '<html lang="en">'
      };
      
    default:
      return null;
  }
  
  return null;
}

interface FixableIssue {
  code: string;
  element: string;
  selector: string;
  issue: string;
  fix: string;
  impact: string;
  priority: number;
  codeFix: CodeFixResult | null;
}

// More sophisticated scoring algorithm
function calculatePotentialImprovement(fixableIssues: FixableIssue[]): number {
  // Base score impact by priority
  const priorityWeights: Record<number, number> = {
    1: 3,  // High priority issues have most impact
    2: 2,  // Medium priority  
    3: 1   // Low priority
  };
  
  // Impact multipliers
  const impactMultipliers: Record<string, number> = {
    'high': 1.5,
    'medium': 1.0,
    'low': 0.5
  };
  
  // Calculate weighted improvement score
  let improvementScore = 0;
  
  fixableIssues.forEach(issue => {
    const priorityWeight = priorityWeights[issue.priority] || 1;
    const impactMultiplier = impactMultipliers[issue.impact] || 1.0;
    
    improvementScore += priorityWeight * impactMultiplier;
  });
  
  // Cap the maximum improvement at 40 points
  return Math.min(40, Math.round(improvementScore));
}

export const fetchAccessibilityReport = async (url: string) => {
  try {
    if (!url.startsWith('https://') && !url.startsWith('http://')) {
      url = 'https://' + url
    }

    const domain = stripUrlToDomain(url)
    
    // Use the existing findSite service instead of our custom findSiteId function
    const site = await findSite(domain)
    if (!site) {
      throw new Error(`Site not found for domain: ${domain}`)
    }

    // Use site.id for caching and saving
    const cachedResult = await getCachedScanResult(domain, site.id)
    if (cachedResult) {
      return cachedResult
    }

    const result = await getAccessibilityInformationPally(url)
    
    const siteImg = await fetchSitePreview(url)
    if (siteImg) {
      result.siteImg = siteImg
    }

    if (result) {
      const guideErrors: {
        errors: htmlcsOutput[];
        notices: htmlcsOutput[];
        warnings: htmlcsOutput[];
      } = result?.htmlcs;
      
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
              // Add error description based on error guideline
              error.code = error['Error Guideline'];
              delete error['Error Guideline'];

              error.description =
                      errorCodeWithDescriptions[error.code]?.description;
              error.context =
                    errorCodeWithDescriptions[error.code]?.context;
              error.message =
                    errorCodeWithDescriptions[error.code]?.message;
              error.recommended_action =
                    errorCodeWithDescriptions[error.code]?.recommended_action;
              error.selectors =
                    errorCodeWithDescriptions[error.code]?.selectors;
            });
          },
        );
              
        result.ByFunctions = completion.HumanFunctionalities;
      }

      if (result?.ByFunctions) {
        // Save using site.id from findSite
        await saveScanResult(domain, result, site.id)
        return result
      }
    }
        
  } catch (error) {
    console.error(error);
    throw new Error(`${error} Error processing accessibility report`);
  }
};


export const fetchSitePreview = async (url: string) => {
  try {
      const apiUrl = `${process.env.SECONDARY_SERVER_URL}/screenshot/?url=${url}`;
      
      // Use fetch to request the screenshot
      const response = await fetch(apiUrl);

      // Check if the response is successful
      if (!response.ok) {
          throw new Error(`Failed to fetch screenshot. Status: ${response.status}`);
      }

      // Get the response as a buffer (binary data)
      const buffer = await response.arrayBuffer();

      // Convert the buffer to a base64 encoded string
      const base64Image = Buffer.from(buffer).toString('base64');

      // Create a Data URL from the base64 encoded string
      const dataUrl = `data:image/png;base64,${base64Image}`;
      return dataUrl;
  } catch (error) {
      console.error('Error generating screenshot:', error);
      return null;
  }
};

// Update the getMachineFixableIssues function
export const getMachineFixableIssues = async (url: string) => {
  try {
    if (!url.startsWith('https://') && !url.startsWith('http://')) {
      url = 'https://' + url;
    }

    const domain = stripUrlToDomain(url);
    
    // Find site in allowed sites
    const site = await findSite(domain);
    if (!site) {
      throw new Error(`Site not found for domain: ${domain}`);
    }
    
    // Get the full accessibility report
    const fullReport = await fetchAccessibilityReport(url);
    
    // Extract machine-fixable issues
    const fixableIssues = [];
    let totalIssueCount = 0;
    
    // Add this debug logging
    console.log('Accessibility issues found:', 
      (fullReport.htmlcs?.errors || []).map((i: htmlcsOutput) => i.code),
      (fullReport.htmlcs?.warnings || []).map((i: htmlcsOutput) => i.code),
      (fullReport.htmlcs?.notices || []).map((i: htmlcsOutput) => i.code)
    );
    
    // Process htmlcs errors, warnings, and notices
    if (fullReport.htmlcs) {
      for (const issueType of ['errors', 'warnings', 'notices']) {
        if (Array.isArray(fullReport.htmlcs[issueType])) {
          totalIssueCount += fullReport.htmlcs[issueType].length;
          
          for (const issue of fullReport.htmlcs[issueType]) {
            const issueCode = issue.code;
            console.log('Checking issue code:', issueCode);
            
            // Try different matching approaches
            const fixableInfo = MACHINE_FIXABLE_ISSUES[issueCode as keyof typeof MACHINE_FIXABLE_ISSUES] || 
              // Try matching just part of the code
              Object.entries(MACHINE_FIXABLE_ISSUES).find(([key]) => 
                issueCode && key.includes(issueCode.split('.').pop() || '')
              )?.[1];
            
            if (fixableInfo) {
              const codeFix = await generateCodeFix(issue, fixableInfo.fixType, site.id, domain);
              
              fixableIssues.push({
                code: issueCode,
                element: issue.context ? issue.context[0] : '',
                selector: issue.selectors ? issue.selectors[0] : '',
                issue: issue.message || issue.description || fixableInfo.description,
                fix: issue.recommended_action || `Fix the ${fixableInfo.description.toLowerCase()}`,
                impact: fixableInfo.impact,
                priority: fixableInfo.priority,
                codeFix: codeFix
              });
            } else if (issue.message && (
              issue.message.toLowerCase().includes('alt') || 
              issue.message.toLowerCase().includes('label') ||
              issue.message.toLowerCase().includes('aria') ||
              issue.message.toLowerCase().includes('contrast')
            )) {
              // Fallback to message content matching for common fixable issues
              const fixType = 
                issue.message.toLowerCase().includes('alt') ? 'alt' :
                issue.message.toLowerCase().includes('label') ? 'label' :
                issue.message.toLowerCase().includes('aria') ? 'aria' :
                issue.message.toLowerCase().includes('contrast') ? 'contrast' : 'other';
                
              const codeFix = await generateCodeFix(issue, fixType, site.id, domain);
              
              fixableIssues.push({
                code: issueCode || 'UNKNOWN',
                element: issue.context ? issue.context[0] : '',
                selector: issue.selectors ? issue.selectors[0] : '',
                issue: issue.message || issue.description || 'Accessibility issue',
                fix: issue.recommended_action || `Fix the ${fixType} issue`,
                impact: issue.impact || 'medium',
                priority: fixType === 'alt' || fixType === 'label' ? 1 : 2,
                codeFix: codeFix
              });
            }
          }
        }
      }
    }
    
    // Sort issues by priority (highest first)
    fixableIssues.sort((a, b) => a.priority - b.priority);
    
    // Calculate potential score improvement
    const potentialImprovement = calculatePotentialImprovement(fixableIssues);
    
    return {
      url: domain,
      totalIssues: totalIssueCount,
      fixableIssues: fixableIssues,
      potentialScoreImprovement: potentialImprovement
    };
    
  } catch (error) {
    console.error('Error fetching machine fixable issues:', error);
    throw new Error(`Error processing machine fixable issues: ${error.message}`);
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