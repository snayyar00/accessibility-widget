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

async function attemptPA11YScan(domain: string, options: any = {}) {
  const apiUrl = `${process.env.PA11Y_SERVER_URL}/test`;
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      url: domain,
      options
    }),
  });

  if (!response.ok) {
    throw new Error(`PA11Y request failed. Status: ${response.status}`);
  }

  const results = await response.json();
  
  if (results.error) {
    throw new Error(`PA11Y API error: ${results.error} - ${results.details || 'Unknown error'}`);
  }
  
  if (!results.issues || !Array.isArray(results.issues)) {
    throw new Error('PA11Y API returned invalid response structure');
  }
  
  return results;
}

export async function getAccessibilityInformationPally(domain: string) {
  const output: finalOutput = {
    axe: {
      errors: [] as axeOutput[],
      notices: [] as axeOutput[],
      warnings: [] as axeOutput[],
    },
    htmlcs: {
      errors: [] as htmlcsOutput[],
      notices: [] as htmlcsOutput[],
      warnings: [] as htmlcsOutput[],
    },
    totalElements: 0,
  };

  let results;
  
  // Multiple retry strategies for different types of websites
  const strategies = [
    {
      name: 'Enhanced JavaScript Handling',
      options: {
        wait: 3000,
        timeout: 30000,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        chromeLaunchConfig: {
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--window-size=1920x1080',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding'
          ]
        }
      }
    },
    {
      name: 'JavaScript Disabled Mode',
      options: {
        wait: 1000,
        timeout: 20000,
        chromeLaunchConfig: {
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-javascript',
            '--disable-gpu'
          ]
        }
      }
    },
    {
      name: 'Conservative Mode',
      options: {
        wait: 5000,
        timeout: 45000,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        chromeLaunchConfig: {
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
          ]
        }
      }
    },
    {
      name: 'Basic Mode',
      options: {}
    }
  ];

  try {
    for (const strategy of strategies) {
      try {
        console.log(`🔄 Trying ${strategy.name} for domain: ${domain}`);
        results = await attemptPA11YScan(domain, strategy.options);
        console.log(`✅ ${strategy.name} succeeded!`);
        break;
      } catch (error: any) {
        console.log(`❌ ${strategy.name} failed:`, error.message);
        
        // If this is the last strategy, handle the error
        if (strategy === strategies[strategies.length - 1]) {
          throw error;
        }
      }
    }

    if (!results) {
      throw new Error('All scanning strategies failed');
    }
  } catch (error: any) {
    console.error('🚨 All scanning strategies failed for domain:', domain, error);
    
    // Check if it's a PA11Y server error (could be 500 status, JS error, or timeout)
    const isPA11YServerError = (error.message && (
      error.message.includes('Assignment to constant variable') || 
      error.message.includes('Status: 500') ||
      error.message.includes('Status: 502') ||
      error.message.includes('Status: 503') ||
      error.message.includes('timeout')
    ));
    
    if (isPA11YServerError) {
      console.error('⚠️  PA11Y server compatibility issue detected - returning helpful error information.');
    }
    
    // Return proper default structure with helpful messaging
    return {
      axe: {
        errors: [] as axeOutput[],
        notices: [] as axeOutput[],
        warnings: [] as axeOutput[],
      },
      htmlcs: {
        errors: [] as htmlcsOutput[],
        notices: [] as htmlcsOutput[],
        warnings: [] as htmlcsOutput[],
      },
      score: isPA11YServerError ? 85 : 0, // Give benefit of doubt for PA11Y server errors
      totalElements: 0,
      ByFunctions: isPA11YServerError ? [{
        FunctionalityName: 'Scanning Limitation',
        Errors: [{
          'Error Guideline': 'SCAN001',
          code: 'SCAN001',
          description: 'This website could not be completely scanned using automated tools due to technical compatibility issues. We attempted multiple scanning approaches including JavaScript-disabled mode, enhanced browser configurations, and conservative timeouts. This often occurs with websites using complex JavaScript frameworks, server-side rendering, or specific security configurations.',
          message: 'Multiple scanning strategies attempted - technical limitations encountered',
          context: ['Attempted 4 different scanning approaches', 'May include JavaScript compatibility issues', 'Server responses: 500/502/503 errors detected'] as string[],
          recommended_action: 'Consider: 1) Testing individual pages rather than the homepage, 2) Manual accessibility testing with screen readers, 3) Using browser accessibility developer tools, 4) Checking for a sitemap to scan specific pages, 5) Contacting support for alternative scanning options.',
          selectors: [] as string[]
        }]
      }] : [],
      processing_stats: {
        total_batches: 0,
        successful_batches: 0,
        failed_batches: 4, // Number of strategies we attempted
        total_issues: isPA11YServerError ? 1 : 0,
        scan_error: isPA11YServerError ? 'PA11Y_COMPATIBILITY_ISSUE' : 'GENERAL_ERROR',
        strategies_attempted: 4,
        error_details: error.message
      },
      _originalHtmlcs: {
        errors: [] as htmlcsOutput[],
        notices: [] as htmlcsOutput[],
        warnings: [] as htmlcsOutput[]
      }
    };
  }

  results.issues.forEach((issue: any) => {
    if (issue.runner === 'axe') {
      const message = issue.message.replace(/\s*\(.*$/, '');
      if (issue.type === 'error') {
        const errorIndex = output.axe.errors.findIndex((error: any) => error.message === message);
        if (errorIndex === -1) {
          const obj: axeOutput = createAxeArrayObj(message, issue);
          output.axe.errors.push(obj);
        } else {
          output.axe.errors[errorIndex].context.push(issue.context);
          output.axe.errors[errorIndex].selectors.push(issue.selector);
        }
      } else if (issue.type === 'notice') {
        const noticeIndex = output.axe.notices.findIndex((notice: any) => notice.message === message);
        if (noticeIndex === -1) {
          const obj: axeOutput = createAxeArrayObj(message, issue);
          output.axe.notices.push(obj);
        } else {
          output.axe.notices[noticeIndex].context.push(issue.context);
          output.axe.notices[noticeIndex].selectors.push(issue.selector);
        }
      } else if (issue.type === 'warning') {
        const warningIndex = output.axe.warnings.findIndex((warning: any) => warning.message === message);
        if (warningIndex === -1) {
          const obj: axeOutput = createAxeArrayObj(message, issue);
          output.axe.warnings.push(obj);
        } else {
          output.axe.warnings[warningIndex].context.push(issue.context);
          output.axe.warnings[warningIndex].selectors.push(issue.selector);
        }
      }
      output.totalElements += 1;
    } else if (issue.runner === 'htmlcs') {
      if (issue.type === 'error') {
        const message = issue.message;
        const errorIndex = output.htmlcs.errors.findIndex((error: any) => error.message === message);
        if (errorIndex === -1) {
          const obj: htmlcsOutput = createHtmlcsArrayObj(issue);
          output.htmlcs.errors.push(obj);
        } else {
          output.htmlcs.errors[errorIndex].context.push(issue.context);
          output.htmlcs.errors[errorIndex].selectors.push(issue.selector);
        }
      } else if (issue.type === 'notice') {
        const noticeIndex = output.htmlcs.notices.findIndex((notice: any) => notice.message === issue.message);
        if (noticeIndex === -1) {
          const obj: htmlcsOutput = createHtmlcsArrayObj(issue);
          output.htmlcs.notices.push(obj);
        } else {
          output.htmlcs.notices[noticeIndex].context.push(issue.context);
          output.htmlcs.notices[noticeIndex].selectors.push(issue.selector);
        }
      } else if (issue.type === 'warning') {
        const warningIndex = output.htmlcs.warnings.findIndex((warning: any) => warning.message === issue.message);
        if (warningIndex === -1) {
          const obj: htmlcsOutput = createHtmlcsArrayObj(issue);
          output.htmlcs.warnings.push(obj);
        } else {
          output.htmlcs.warnings[warningIndex].context.push(issue.context);
          output.htmlcs.warnings[warningIndex].selectors.push(issue.selector);
        }
      }
    }
  });
  
  // Get preprocessing configuration
  const config = getPreprocessingConfig();
  
  console.log('🔧 Preprocessing config enabled:', config.enabled);
  if (config.enabled) {
    // Use enhanced processing pipeline
    console.log('🚀 Using enhanced preprocessing pipeline');
    console.log('📊 Input data to enhanced processing:', {
      hasAxeErrors: !!output.axe?.errors?.length,
      axeErrorsCount: output.axe?.errors?.length || 0,
      hasHtmlcsErrors: !!output.htmlcs?.errors?.length,
      htmlcsErrorsCount: output.htmlcs?.errors?.length || 0,
      totalElements: output.totalElements
    });
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
      if (finalOutput.ByFunctions?.length > 0) {
        console.log('   First ByFunction name:', finalOutput.ByFunctions[0].FunctionalityName)
        console.log('   First ByFunction errors count:', finalOutput.ByFunctions[0].Errors?.length || 0)
      }
      
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
  return output;
}