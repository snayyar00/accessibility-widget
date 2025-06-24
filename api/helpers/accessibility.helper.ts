import { readAccessibilityDescriptionFromDb } from '../services/accessibilityReport/accessibilityIssues.service';
import { processAccessibilityIssuesWithFallback } from '../services/accessibilityReport/enhancedProcessing.service';
import { getPreprocessingConfig } from '../config/preprocessing.config';

// const pa11y = require('pa11y');

interface axeOutput {
  message: string;
  context: string[];
  selectors: string[];
  impact: string;
  description: string;
  help: string;
}

interface htmlcsOutput {
  code: string;
  message: string;
  context: string[];
  selectors: string[];
}

interface finalOutput {
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
  score?: number;
  totalElements: number;
  siteImg?:string;
  ByFunctions?: HumanFunctionality[];
  processing_stats?: any;
  _originalHtmlcs?: {
    errors: htmlcsOutput[];
    notices: htmlcsOutput[];
    warnings: htmlcsOutput[];
  };
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

function createAxeArrayObj(message: string, issue: any) {
  const obj: axeOutput = {
    message: message,
    context: [issue.context],
    selectors: [issue.selector],
    impact: issue.runnerExtras.impact,
    description: issue.runnerExtras.description,
    help: issue.runnerExtras.help,
  };
  return obj;
}
function createHtmlcsArrayObj(issue: any) {
  const obj: htmlcsOutput = {
    code: issue.code,
    message: issue.message,
    context: [issue.context],
    selectors: [issue.selector],
  };
  return obj;
}

function calculateAccessibilityScore(issues: { errors: axeOutput[]; warnings: axeOutput[]; notices: axeOutput[] }) {
  let score = 0;
  const issueWeights: Record<string, number> = { error: 3, warning: 2, notice: 1 };
  const impactWeights: Record<string, number> = { critical: 4, serious: 3, moderate: 2, minor: 1 };

  issues.errors.forEach((issue) => {
    const impactWeight = impactWeights[issue.impact.toLowerCase()] || 0;
    score += issueWeights.error * impactWeight;
  });

  issues.warnings.forEach((issue) => {
    const impactWeight = impactWeights[issue.impact.toLowerCase()] || 0;
    score += issueWeights.warning * impactWeight;
  });

  issues.notices.forEach((issue) => {
    const impactWeight = impactWeights[issue.impact.toLowerCase()] || 0;
    score += issueWeights.notice * impactWeight;
  });
  // Normalize the score to a maximum of 70%
  const maxScore = 70;
  return Math.min(Math.floor(score), maxScore);
}

export async function getAccessibilityInformationPally(domain: string) {
  const output: finalOutput = {
    axe: {
      errors: [],
      notices: [],
      warnings: [],
    },
    htmlcs: {
      errors: [],
      notices: [],
      warnings: [],
    },
    totalElements: 0,
  };

  //const apiUrl = `${process.env.PA11Y_SERVER_URL}/test`;
  const apiUrl = `${process.env.SCANNER_SERVER_URL}/scan`;
  let results: any;
  try {
    // Make the POST request with the URL in the body
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: domain }),
    });

    // Check if the response is successful
    if (!response.ok) {
      throw new Error(`Failed to fetch screenshot. Status: ${response.status}`);
    }

    // Parse and return the response JSON
    results = await response.json();
    console.log('pally API results:', results);
    
    // Debug runnerExtras structure
    if (results.issues && results.issues.length > 0) {
      console.log('🔍 First issue runnerExtras keys:', Object.keys(results.issues[0].runnerExtras || {}));
      console.log('🔍 First issue runnerExtras:', JSON.stringify(results.issues[0].runnerExtras, null, 2));
      console.log(`📊 Total issues from Scanner API: ${results.issues.length}`);
      
      // Show breakdown by type and runner
      const breakdown = results.issues.reduce((acc: any, issue: any) => {
        const key = `${issue.runner}-${issue.type}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
      console.log('📈 Issue breakdown:', breakdown);
    }
    
  } catch (error) {
    console.error('pally API Error', error);
    // Return proper default structure instead of undefined
    return {
      axe: {
        errors: [],
        notices: [],
        warnings: [],
      },
      htmlcs: {
        errors: [],
        notices: [],
        warnings: [],
      },
      score: 0,
      totalElements: 0,
      ByFunctions: [],
      processing_stats: {
        total_batches: 0,
        successful_batches: 0,
        failed_batches: 1,
        total_issues: 0
      }
    };
  }

  console.log(`📊 Processing ${results.issues.length} issues from SCANNER_SERVER_URL`);
  console.log('🔍 First few issues:', results.issues.slice(0, 3).map((issue: any) => ({ runner: issue.runner, type: issue.type, message: issue.message?.substring(0, 50) })));
  
  // Process each issue individually to preserve uniqueness
  results.issues.forEach((issue: any, index: number) => {
    console.log(`Processing issue ${index + 1}/${results.issues.length}: ${issue.runner}-${issue.type}-${issue.code}`);
    
    if (issue.runner === 'axe') {
      // Clean message for consistent grouping
      const message = issue.message.replace(/\s*\(.*$/, '');
      
      // Create unique key based on code + selector to avoid over-grouping
      const uniqueKey = `${issue.code || 'unknown'}-${issue.selector}`;
      
      const obj: axeOutput = {
        message: message,
        context: [issue.context],
        selectors: [issue.selector],
        impact: issue.runnerExtras?.impact || issue.impact || 'minor',
        description: issue.runnerExtras?.description || issue.description || message,
        help: issue.runnerExtras?.help || issue.help || '',
      };
      
      if (issue.type === 'error') {
        // Check if we already have this exact issue (same code + selector)
        const existingIndex = output.axe.errors.findIndex((error) => 
          error.message === message && error.selectors.includes(issue.selector)
        );
        if (existingIndex === -1) {
          output.axe.errors.push(obj);
        } else {
          // Only add context if it's different
          if (!output.axe.errors[existingIndex].context.includes(issue.context)) {
            output.axe.errors[existingIndex].context.push(issue.context);
          }
        }
      } else if (issue.type === 'notice') {
        const existingIndex = output.axe.notices.findIndex((notice) => 
          notice.message === message && notice.selectors.includes(issue.selector)
        );
        if (existingIndex === -1) {
          output.axe.notices.push(obj);
        } else {
          if (!output.axe.notices[existingIndex].context.includes(issue.context)) {
            output.axe.notices[existingIndex].context.push(issue.context);
          }
        }
      } else if (issue.type === 'warning') {
        const existingIndex = output.axe.warnings.findIndex((warning) => 
          warning.message === message && warning.selectors.includes(issue.selector)
        );
        if (existingIndex === -1) {
          output.axe.warnings.push(obj);
        } else {
          if (!output.axe.warnings[existingIndex].context.includes(issue.context)) {
            output.axe.warnings[existingIndex].context.push(issue.context);
          }
        }
      }
      output.totalElements += 1;
    } else if (issue.runner === 'htmlcs') {
      const obj: htmlcsOutput = {
        code: issue.code || issue.message || 'unknown',
        message: issue.message,
        context: [issue.context],
        selectors: [issue.selector],
      };
      
      if (issue.type === 'error') {
        const existingIndex = output.htmlcs.errors.findIndex((error) => 
          error.message === issue.message && error.selectors.includes(issue.selector)
        );
        if (existingIndex === -1) {
          output.htmlcs.errors.push(obj);
        } else {
          if (!output.htmlcs.errors[existingIndex].context.includes(issue.context)) {
            output.htmlcs.errors[existingIndex].context.push(issue.context);
          }
        }
      } else if (issue.type === 'notice') {
        const existingIndex = output.htmlcs.notices.findIndex((notice) => 
          notice.message === issue.message && notice.selectors.includes(issue.selector)
        );
        if (existingIndex === -1) {
          output.htmlcs.notices.push(obj);
        } else {
          if (!output.htmlcs.notices[existingIndex].context.includes(issue.context)) {
            output.htmlcs.notices[existingIndex].context.push(issue.context);
          }
        }
      } else if (issue.type === 'warning') {
        const existingIndex = output.htmlcs.warnings.findIndex((warning) => 
          warning.message === issue.message && warning.selectors.includes(issue.selector)
        );
        if (existingIndex === -1) {
          output.htmlcs.warnings.push(obj);
        } else {
          if (!output.htmlcs.warnings[existingIndex].context.includes(issue.context)) {
            output.htmlcs.warnings[existingIndex].context.push(issue.context);
          }
        }
      }
    }
  });
  
  console.log(`📈 Final processed counts:`);
  console.log(`   AXE: ${output.axe.errors.length} errors, ${output.axe.warnings.length} warnings, ${output.axe.notices.length} notices`);
  console.log(`   HTMLCS: ${output.htmlcs.errors.length} errors, ${output.htmlcs.warnings.length} warnings, ${output.htmlcs.notices.length} notices`);
  console.log(`   Total processed: ${output.axe.errors.length + output.axe.warnings.length + output.axe.notices.length + output.htmlcs.errors.length + output.htmlcs.warnings.length + output.htmlcs.notices.length}`);
  console.log(`   Original total: ${results.issues.length}`);
  
  // Add screenshot data to output if available  
  if (results.siteImg) {
    output.siteImg = results.siteImg;
    console.log(`📸 Added site screenshot to output`);
  } else if (results.screenshots && Array.isArray(results.screenshots) && results.screenshots.length > 0) {
    output.siteImg = results.screenshots[0]; // Use first screenshot
    console.log(`📸 Added screenshot to output (${Math.round((results.screenshots[0].length * 3/4) / 1024)}KB)`);
  }
  
  // Get preprocessing configuration
  const config = getPreprocessingConfig();
  
  if (config.enabled) {
    // Use enhanced processing pipeline
    console.log('🚀 Using enhanced preprocessing pipeline');
    try {
      const enhancedResult = await processAccessibilityIssuesWithFallback(output);
  
      // Debug: Check what we got from enhanced processing
      console.log('🔍 Enhanced processing result debug:')
      console.log('   enhancedResult.ByFunctions exists:', !!enhancedResult.ByFunctions)
      console.log('   enhancedResult.ByFunctions length:', enhancedResult.ByFunctions?.length || 0)
      if (enhancedResult.ByFunctions?.[0]) {
        console.log('   First group:', enhancedResult.ByFunctions[0].FunctionalityName)
        console.log('   First group errors:', enhancedResult.ByFunctions[0].Errors?.length || 0)
        if (enhancedResult.ByFunctions[0].Errors?.[0]) {
          console.log('   First error description:', enhancedResult.ByFunctions[0].Errors[0].description?.substring(0, 50))
        }
      }
      
      // Preserve original error codes for ByFunctions processing
      // Store the original format before enhancement
      const originalOutput = JSON.parse(JSON.stringify(output)); // Deep clone
      
      // Merge enhanced results back to original format
      const finalOutput: finalOutput = {
        axe: enhancedResult.axe,
        htmlcs: enhancedResult.htmlcs,
        ByFunctions: enhancedResult.ByFunctions, // Preserve enhanced ByFunctions
        score: calculateAccessibilityScore(output.axe), //enhancedResult.score || 
        totalElements: output.totalElements,
        processing_stats: enhancedResult.processing_stats,
        // Preserve original htmlcs for ByFunctions processing
        _originalHtmlcs: originalOutput.htmlcs
      };
      
      console.log('📦 Final output debug:')
      console.log('   finalOutput.ByFunctions exists:', !!finalOutput.ByFunctions)
      console.log('   finalOutput.ByFunctions length:', finalOutput.ByFunctions?.length || 0)
      
      return finalOutput;
      
    } catch (error) {
      console.error('❌ Enhanced processing failed, falling back to legacy:', error);
      // Continue with legacy processing below
    }
  }
  
  // Legacy processing path (fallback)
  console.log('⚙️ Using legacy processing pipeline');
  output.score = calculateAccessibilityScore(output.axe);
  const result = await readAccessibilityDescriptionFromDb(output.htmlcs);
  output.htmlcs = result;
  
  // Create basic ByFunctions data for legacy processing
  output.ByFunctions = createBasicByFunctions(output);
  return output;
}

function createBasicByFunctions(output: finalOutput): HumanFunctionality[] {
  const byFunctions: HumanFunctionality[] = [];
  
  // Combine all issues from both runners
  const allIssues: any[] = [];
  
  // Add issues from axe results
  allIssues.push(...(output.axe.errors || []).map(issue => ({ ...issue, type: 'error', runner: 'axe' })));
  allIssues.push(...(output.axe.warnings || []).map(issue => ({ ...issue, type: 'warning', runner: 'axe' })));
  allIssues.push(...(output.axe.notices || []).map(issue => ({ ...issue, type: 'notice', runner: 'axe' })));
  
  // Add issues from htmlcs results
  allIssues.push(...(output.htmlcs.errors || []).map(issue => ({ ...issue, type: 'error', runner: 'htmlcs' })));
  allIssues.push(...(output.htmlcs.warnings || []).map(issue => ({ ...issue, type: 'warning', runner: 'htmlcs' })));
  allIssues.push(...(output.htmlcs.notices || []).map(issue => ({ ...issue, type: 'notice', runner: 'htmlcs' })));
  
  // Group issues by functionality
  const functionalityGroups: { [key: string]: any[] } = {
    'Blind': [],
    'Low Vision': [],
    'Mobility': [],
    'Cognitive': [],
    'Deaf/Hard of Hearing': []
  };
  
  allIssues.forEach(issue => {
    const code = issue.code || issue.message || '';
    const message = issue.message || '';
    const description = issue.description || '';
    
    // Simple categorization based on keywords
    if (code.includes('alt') || code.includes('image') || code.includes('aria-label') || 
        message.includes('screen reader') || message.includes('alternative text')) {
      functionalityGroups['Blind'].push(issue);
    } 
    else if (code.includes('contrast') || code.includes('color') || code.includes('focus') ||
             message.includes('contrast') || message.includes('color')) {
      functionalityGroups['Low Vision'].push(issue);
    }
    else if (code.includes('keyboard') || code.includes('tab') || message.includes('keyboard')) {
      functionalityGroups['Mobility'].push(issue);
    }
    else if (code.includes('heading') || code.includes('landmark') || code.includes('structure') ||
             message.includes('heading') || message.includes('structure') || code.includes('region')) {
      functionalityGroups['Cognitive'].push(issue);
    }
    else if (code.includes('audio') || code.includes('video') || code.includes('media') ||
             message.includes('audio') || message.includes('captions')) {
      functionalityGroups['Deaf/Hard of Hearing'].push(issue);
    }
    else {
      // Default to Cognitive for general accessibility issues
      functionalityGroups['Cognitive'].push(issue);
    }
  });
  
  // Convert to ByFunctions format
  Object.entries(functionalityGroups)
    .filter(([, issues]) => issues.length > 0)
    .forEach(([functionalityName, issues]) => {
      byFunctions.push({
        FunctionalityName: functionalityName,
        Errors: issues.map(issue => ({
          code: issue.code || 'N/A',
          description: issue.description || issue.message || 'Accessibility issue detected',
          message: issue.message || '',
          context: issue.context || [],
          recommended_action: 'Review and fix this accessibility issue',
          selectors: issue.selectors || [],
        }))
      });
    });
  
  return byFunctions;
}
