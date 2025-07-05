import { readAccessibilityDescriptionFromDb } from '../services/accessibilityReport/accessibilityIssues.service';

interface WebAbilityIssue {
  code: string;
  type: string;
  typeCode: number;
  message: string;
  context: string;
  selector: string;
  runner: string;
  runnerExtras: {
    description: string;
    impact: string;
    help: string;
    helpUrl: string;
  };
  screenshotUrl?: string;
}

interface WebAbilityResponse {
  documentTitle: string;
  pageUrl: string;
  issues: WebAbilityIssue[];
  totalElements: number;
  score: number;
  siteImg: string;
  screenshots: string[];
  violation_screenshots: number;
  browser_info: {
    userAgent: string;
    viewport: [number, number];
    orientation: string;
  };
  accessibility_standards: {
    wcag_version: string;
    compliance_level: string;
    tested_rules: number;
    passed_rules: number;
    failed_rules: number;
    incomplete_rules: number;
    inapplicable_rules: number;
  };
  issue_breakdown: {
    by_type: { errors: number; warnings: number; notices: number; total: number };
    by_severity: { critical: number; serious: number; moderate: number; minor: number; unknown: number };
    by_category: { perceivable: number; operable: number; understandable: number; robust: number; best_practice: number; other: number };
  };
  job_id: string;
  scan_duration: number;
  scan_timestamp: string;
  scan_url: string;
}

// Legacy format interfaces (maintain compatibility)
interface axeOutput {
  message: string;
  context: string[];
  selectors: string[];
  impact: string;
  description: string;
  help: string;
  // Enhanced WebAbility fields
  screenshotUrl?: string;
  helpUrl?: string;
  runner?: string;
  wcagLevel?: string;
}

interface htmlcsOutput {
  code: string;
  message: string;
  context: string[];
  selectors: string[];
  // Enhanced WebAbility fields
  screenshotUrl?: string;
  helpUrl?: string;
  runner?: string;
  impact?: string;
  wcagLevel?: string;
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
  siteImg?: string;
  ByFunctions?: HumanFunctionality[];
  processing_stats?: any;
  _originalHtmlcs?: {
    errors: htmlcsOutput[];
    notices: htmlcsOutput[];
    warnings: htmlcsOutput[];
  };
  // Enhanced WebAbility metadata
  webability_metadata?: {
    job_id: string;
    scan_duration: number;
    scan_timestamp: string;
    browser_info: {
      userAgent: string;
      viewport: [number, number];
      orientation: string;
    };
    accessibility_standards: {
      wcag_version: string;
      compliance_level: string;
      tested_rules: number;
      passed_rules: number;
      failed_rules: number;
      incomplete_rules: number;
      inapplicable_rules: number;
    };
    issue_breakdown: {
      by_type: { errors: number; warnings: number; notices: number; total: number };
      by_severity: { critical: number; serious: number; moderate: number; minor: number; unknown: number };
      by_category: { perceivable: number; operable: number; understandable: number; robust: number; best_practice: number; other: number };
    };
    screenshots: string[];
    violation_screenshots: number;
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
  // Enhanced WebAbility fields
  screenshotUrl?: string;
  helpUrl?: string;
  runner?: string;
  impact?: string;
  wcagLevel?: string;
}

interface HumanFunctionality {
  'FunctionalityName': string;
  Errors: Error[];
}

/**
 * Extract WCAG level from issue code or help URL
 */
function extractWCAGLevel(code: string, helpUrl?: string): string {
  // Check for WCAG pattern in code (e.g., "1.4.3", "2.1.1", etc.)
  const wcagPattern = /(\d+\.\d+\.\d+)/;
  const codeMatch = code?.match(wcagPattern);
  if (codeMatch) {
    const level = codeMatch[1];
    // Determine AA or AAA based on WCAG criteria
    if (level.startsWith('1.4.6') || level.startsWith('1.4.11') || level.startsWith('2.5.5')) {
      return 'AAA';
    }
    return 'AA';
  }

  // Check help URL for WCAG information
  if (helpUrl) {
    const urlMatch = helpUrl.match(wcagPattern);
    if (urlMatch) {
      return 'AA'; // Most axe rules are AA level
    }
  }

  // Default based on common patterns
  if (code?.includes('color-contrast')) return 'AA';
  if (code?.includes('aria-')) return 'AA';
  if (code?.includes('landmark')) return 'AA';
  
  return 'A'; // Default fallback
}

/**
 * Adapter function to convert WebAbility response to legacy Pally format
 * This ensures zero-downtime migration by maintaining API compatibility
 */
function adaptWebAbilityToPallyFormat(webAbilityResponse: WebAbilityResponse): finalOutput {
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
    totalElements: webAbilityResponse.totalElements,
    score: webAbilityResponse.score,
    siteImg: webAbilityResponse.siteImg,
  };

  // Convert ALL WebAbility issues to legacy format (don't limit - users need to see everything)
  console.log('🔄 Converting WebAbility issues to legacy format. Total:', webAbilityResponse.issues.length);
  
  webAbilityResponse.issues.forEach((issue: WebAbilityIssue, index: number) => {
    // Process each issue for conversion
    
    if (issue.runner === 'axe') {
      const axeIssue: axeOutput = {
        message: issue.message.replace(/\s*\(.*$/, ''),
        context: [issue.context],
        selectors: [issue.selector],
        impact: issue.runnerExtras.impact,
        description: issue.runnerExtras.description,
        help: issue.runnerExtras.help,
        // Enhanced WebAbility fields
        screenshotUrl: issue.screenshotUrl,
        helpUrl: issue.runnerExtras.helpUrl,
        runner: issue.runner,
        wcagLevel: extractWCAGLevel(issue.code, issue.runnerExtras.helpUrl),
      };
      
      // Created axe issue for processing

      // Map issue types to legacy categories with smart grouping
      if (issue.type === 'error' || issue.runnerExtras.impact === 'critical' || issue.runnerExtras.impact === 'serious') {
        // Group by message + impact for better deduplication
        const groupKey = `${axeIssue.message}_${axeIssue.impact}`;
        const existingIndex = output.axe.errors.findIndex((existing: any) => 
          `${existing.message}_${existing.impact}` === groupKey
        );
        if (existingIndex === -1) {
          // First occurrence - add the issue
          output.axe.errors.push(axeIssue);
          console.log(`📸 New axe error with screenshot:`, !!axeIssue.screenshotUrl);
        } else {
          // Group similar issues together - preserve all selectors, context, and screenshots
          output.axe.errors[existingIndex].context.push(...(Array.isArray(issue.context) ? issue.context : [issue.context]));
          output.axe.errors[existingIndex].selectors.push(...(Array.isArray(issue.selector) ? issue.selector : [issue.selector]));
          // Preserve screenshot URL if this grouped issue has one
          if (issue.screenshotUrl && !output.axe.errors[existingIndex].screenshotUrl) {
            output.axe.errors[existingIndex].screenshotUrl = issue.screenshotUrl;
            console.log(`📸 Added screenshot to grouped axe error:`, issue.screenshotUrl);
          }
          console.log(`🔗 Grouped axe error: existing screenshot:`, !!output.axe.errors[existingIndex].screenshotUrl, 'new screenshot:', !!issue.screenshotUrl);
        }
      } else if (issue.type === 'warning' || issue.runnerExtras.impact === 'moderate') {
        const groupKey = `${axeIssue.message}_${axeIssue.impact}`;
        const existingIndex = output.axe.warnings.findIndex((existing: any) => 
          `${existing.message}_${existing.impact}` === groupKey
        );
        if (existingIndex === -1) {
          output.axe.warnings.push(axeIssue);
          // Added new axe warning
        } else {
          output.axe.warnings[existingIndex].context.push(...(Array.isArray(issue.context) ? issue.context : [issue.context]));
          output.axe.warnings[existingIndex].selectors.push(...(Array.isArray(issue.selector) ? issue.selector : [issue.selector]));
          // Preserve screenshot URL if this grouped issue has one
          if (issue.screenshotUrl && !output.axe.warnings[existingIndex].screenshotUrl) {
            output.axe.warnings[existingIndex].screenshotUrl = issue.screenshotUrl;
          }
          // Grouped similar axe warning
        }
      } else {
        const groupKey = `${axeIssue.message}_${axeIssue.impact}`;
        const existingIndex = output.axe.notices.findIndex((existing: any) => 
          `${existing.message}_${existing.impact}` === groupKey
        );
        if (existingIndex === -1) {
          output.axe.notices.push(axeIssue);
          // Added new axe notice
        } else {
          output.axe.notices[existingIndex].context.push(...(Array.isArray(issue.context) ? issue.context : [issue.context]));
          output.axe.notices[existingIndex].selectors.push(...(Array.isArray(issue.selector) ? issue.selector : [issue.selector]));
          // Preserve screenshot URL if this grouped issue has one
          if (issue.screenshotUrl && !output.axe.notices[existingIndex].screenshotUrl) {
            output.axe.notices[existingIndex].screenshotUrl = issue.screenshotUrl;
          }
          // Grouped similar axe notice
        }
      }
    } else {
      // Treat non-axe issues as htmlcs for compatibility
      console.log(`📝 Converting ${issue.runner} issue to htmlcs format`);
      const htmlcsIssue: htmlcsOutput = {
        code: issue.code,
        message: issue.message,
        context: [issue.context],
        selectors: [issue.selector],
        // Enhanced WebAbility fields
        screenshotUrl: issue.screenshotUrl,
        helpUrl: issue.runnerExtras?.helpUrl,
        runner: issue.runner,
        impact: issue.runnerExtras?.impact,
        wcagLevel: extractWCAGLevel(issue.code, issue.runnerExtras?.helpUrl),
      };
      
      // Created htmlcs issue for processing

      if (issue.type === 'error' || issue.runnerExtras.impact === 'critical' || issue.runnerExtras.impact === 'serious') {
        const existingIndex = output.htmlcs.errors.findIndex((existing: any) => existing.message === htmlcsIssue.message);
        if (existingIndex === -1) {
          output.htmlcs.errors.push(htmlcsIssue);
        } else {
          output.htmlcs.errors[existingIndex].context.push(issue.context);
          output.htmlcs.errors[existingIndex].selectors.push(issue.selector);
          // Preserve screenshot URL if this grouped issue has one
          if (issue.screenshotUrl && !output.htmlcs.errors[existingIndex].screenshotUrl) {
            output.htmlcs.errors[existingIndex].screenshotUrl = issue.screenshotUrl;
          }
        }
      } else if (issue.type === 'warning' || issue.runnerExtras.impact === 'moderate') {
        const existingIndex = output.htmlcs.warnings.findIndex((existing: any) => existing.message === htmlcsIssue.message);
        if (existingIndex === -1) {
          output.htmlcs.warnings.push(htmlcsIssue);
        } else {
          output.htmlcs.warnings[existingIndex].context.push(issue.context);
          output.htmlcs.warnings[existingIndex].selectors.push(issue.selector);
          // Preserve screenshot URL if this grouped issue has one
          if (issue.screenshotUrl && !output.htmlcs.warnings[existingIndex].screenshotUrl) {
            output.htmlcs.warnings[existingIndex].screenshotUrl = issue.screenshotUrl;
          }
        }
      } else {
        const existingIndex = output.htmlcs.notices.findIndex((existing: any) => existing.message === htmlcsIssue.message);
        if (existingIndex === -1) {
          output.htmlcs.notices.push(htmlcsIssue);
        } else {
          output.htmlcs.notices[existingIndex].context.push(issue.context);
          output.htmlcs.notices[existingIndex].selectors.push(issue.selector);
          // Preserve screenshot URL if this grouped issue has one
          if (issue.screenshotUrl && !output.htmlcs.notices[existingIndex].screenshotUrl) {
            output.htmlcs.notices[existingIndex].screenshotUrl = issue.screenshotUrl;
          }
        }
      }
    }
  });

  // Log conversion results with screenshot tracking
  const convertedCounts = {
    axeErrors: output.axe.errors.length,
    axeWarnings: output.axe.warnings.length,
    axeNotices: output.axe.notices.length,
    htmlcsErrors: output.htmlcs.errors.length,
    htmlcsWarnings: output.htmlcs.warnings.length,
    htmlcsNotices: output.htmlcs.notices.length,
    total: output.axe.errors.length + output.axe.warnings.length + output.axe.notices.length + 
           output.htmlcs.errors.length + output.htmlcs.warnings.length + output.htmlcs.notices.length
  };

  // Count how many issues have screenshots
  const screenshotCounts = {
    axeErrorsWithScreenshots: output.axe.errors.filter(e => e.screenshotUrl).length,
    axeWarningsWithScreenshots: output.axe.warnings.filter(w => w.screenshotUrl).length,
    axeNoticesWithScreenshots: output.axe.notices.filter(n => n.screenshotUrl).length,
    htmlcsErrorsWithScreenshots: output.htmlcs.errors.filter(e => e.screenshotUrl).length,
    htmlcsWarningsWithScreenshots: output.htmlcs.warnings.filter(w => w.screenshotUrl).length,
    htmlcsNoticesWithScreenshots: output.htmlcs.notices.filter(n => n.screenshotUrl).length,
  };
  
  const totalWithScreenshots = Object.values(screenshotCounts).reduce((sum, count) => sum + count, 0);
  
  console.log('📊 Conversion summary:', convertedCounts);
  console.log('📸 Screenshot preservation:', screenshotCounts);
  console.log(`🔢 Original issues: ${webAbilityResponse.issues.length}, Converted issues: ${convertedCounts.total}, With screenshots: ${totalWithScreenshots}`);
  
  if (convertedCounts.total !== webAbilityResponse.issues.length) {
    console.warn(`⚠️ Issue count mismatch! Expected ${webAbilityResponse.issues.length}, got ${convertedCounts.total}`);
  }

  // Calculate a more sensible score based on critical issues only
  const criticalIssues = webAbilityResponse.issues.filter(issue => 
    issue.type === 'error' && 
    (issue.runnerExtras.impact === 'critical' || issue.runnerExtras.impact === 'serious')
  ).length;
  
  // Calculate score: Start at 100, deduct points for critical issues
  // Maximum 5 points per critical issue, minimum score of 50
  let calculatedScore = 100 - (criticalIssues * 5);
  calculatedScore = Math.max(50, Math.min(100, calculatedScore));
  
  // If no critical issues but has warnings, minimum score is 85
  if (criticalIssues === 0 && webAbilityResponse.issues.length > 0) {
    calculatedScore = Math.max(85, calculatedScore);
  }
  
  // Override WebAbility's score with our calculated score
  output.score = calculatedScore;
  
  console.log(`📊 Score calculation: WebAbility score: ${webAbilityResponse.score}, Critical issues: ${criticalIssues}, Calculated score: ${calculatedScore}`);

  // Add processing stats to match legacy format
  output.processing_stats = {
    total_batches: 1,
    successful_batches: 1,
    failed_batches: 0,
    total_issues: webAbilityResponse.issues.length,
    critical_issues: criticalIssues,
    original_score: webAbilityResponse.score,
    calculated_score: calculatedScore,
    scan_duration: webAbilityResponse.scan_duration,
    scan_timestamp: webAbilityResponse.scan_timestamp,
    wcag_version: webAbilityResponse.accessibility_standards.wcag_version,
    compliance_level: webAbilityResponse.accessibility_standards.compliance_level,
    job_id: webAbilityResponse.job_id
  };

  // Store original htmlcs for ByFunctions processing
  output._originalHtmlcs = JSON.parse(JSON.stringify(output.htmlcs));

  // Add essential WebAbility metadata for frontend display
  output.webability_metadata = {
    job_id: webAbilityResponse.job_id,
    scan_duration: webAbilityResponse.scan_duration,
    scan_timestamp: webAbilityResponse.scan_timestamp,
    browser_info: webAbilityResponse.browser_info,
    accessibility_standards: webAbilityResponse.accessibility_standards,
    issue_breakdown: webAbilityResponse.issue_breakdown,
    screenshots: webAbilityResponse.screenshots,
    violation_screenshots: webAbilityResponse.violation_screenshots
  };

  console.log('📊 WebAbility integration completed:', {
    wcag_version: webAbilityResponse.accessibility_standards.wcag_version,
    total_issues: webAbilityResponse.issues.length,
    converted_issues: convertedCounts.total,
    has_screenshots: webAbilityResponse.screenshots.length > 0
  });

  return output;
}

/**
 * Call WebAbility scanner API with progress tracking
 */
async function callWebAbilityAPI(domain: string, options: any = {}): Promise<WebAbilityResponse> {
  const apiUrl = `https://scanner.webability.io/scan`;
  
  const requestBody = {
    url: domain,
    language: options.language || 'en',
    viewport: options.viewport || [1920, 1080],
    timeout: options.timeout || 60,
    runners: options.runners || ['axe', 'wave'],
    screenshots: options.screenshots !== false,
    accessibility_level: options.accessibility_level || 'AA'
  };

  console.log('🔍 Starting WebAbility scan for:', domain);
  console.log('⚙️  Scan configuration:', { 
    timeout: requestBody.timeout + 's',
    runners: requestBody.runners.join(', '),
    screenshots: requestBody.screenshots,
    level: requestBody.accessibility_level 
  });

  // Create abort controller for timeout handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.log('⏰ WebAbility scan timeout - cancelling request');
    controller.abort();
  }, (requestBody.timeout + 30) * 1000); // Add 30 seconds buffer to API timeout

  console.log(`⏳ Scan may take up to ${requestBody.timeout} seconds...`);
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    console.log(`📡 WebAbility API responded with status: ${response.status}`);

    const results = await response.json();

    // Handle 422 and other error responses that still contain data
    if (!response.ok && response.status !== 422) {
      console.error('❌ WebAbility API error response:', results);
      throw new Error(`WebAbility API request failed. Status: ${response.status}`);
    }
    
    // Log the response for debugging
    if (response.status === 422) {
      console.log('⚠️  WebAbility API returned 422 (validation/timeout error)');
      if (results.detail) {
        console.log('📋 Error details:', results.detail);
        if (typeof results.detail === 'string' && results.detail.includes('timeout')) {
          throw new Error(`Website scan timed out after ${requestBody.timeout} seconds. This website may be too complex or slow to scan.`);
        }
      }
    }
    
    console.log(`✅ WebAbility scan completed in ${response.headers.get('x-scan-duration') || 'unknown'} seconds`);
    console.log('📊 Response structure:', Object.keys(results));
    
    if (!results.issues || !Array.isArray(results.issues)) {
      console.error('❌ Invalid WebAbility API response structure:', JSON.stringify(results).substring(0, 500));
      throw new Error('WebAbility API returned invalid response structure');
    }
    
    return results;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`WebAbility scan was cancelled due to timeout (${requestBody.timeout + 30}s). This website may be too complex or slow to scan.`);
    }
    throw error;
  }
}

/**
 * Main function to get accessibility information using WebAbility API
 * with fallback to legacy Pally format for compatibility
 */
export async function getAccessibilityInformationWebAbility(domain: string): Promise<finalOutput> {
  try {
    console.log(`🚀 Using WebAbility scanner for domain: ${domain}`);
    
    // Call WebAbility API
    const webAbilityResponse = await callWebAbilityAPI(domain);
    console.log(`✅ WebAbility scan completed with ${webAbilityResponse.issues.length} issues found`);
    
    // Count critical issues for logging
    const criticalCount = webAbilityResponse.issues.filter(issue => 
      issue.type === 'error' && 
      (issue.runnerExtras.impact === 'critical' || issue.runnerExtras.impact === 'serious')
    ).length;
    
    console.log(`📊 WebAbility results: Original score: ${webAbilityResponse.score}, Critical issues: ${criticalCount}, Total issues: ${webAbilityResponse.issues.length}`);
    
    // Convert to legacy format for compatibility
    const legacyFormat = adaptWebAbilityToPallyFormat(webAbilityResponse);
    
    console.log(`🔄 Converted to legacy format:`, {
      axeErrors: legacyFormat.axe.errors.length,
      axeWarnings: legacyFormat.axe.warnings.length,
      axeNotices: legacyFormat.axe.notices.length,
      htmlcsErrors: legacyFormat.htmlcs.errors.length,
      htmlcsWarnings: legacyFormat.htmlcs.warnings.length,
      htmlcsNotices: legacyFormat.htmlcs.notices.length,
      score: legacyFormat.score,
      totalElements: legacyFormat.totalElements
    });
    
    // Use standard processing pipeline for production
    console.log('⚙️ Using standard processing pipeline with WebAbility data');
    legacyFormat.processing_stats.scanner_type = 'webability';
    const result = await readAccessibilityDescriptionFromDb(legacyFormat.htmlcs);
    legacyFormat.htmlcs = result;
    return legacyFormat;
    
  } catch (error: any) {
    console.error('🚨 WebAbility scanning failed for domain:', domain, error);
    
    // Return proper error structure for consistency
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
      score: 0,
      totalElements: 0,
      ByFunctions: [{
        FunctionalityName: 'Scanning Error',
        Errors: [{
          'Error Guideline': 'WEBABILITY001',
          code: 'WEBABILITY001',
          description: 'Failed to scan website using WebAbility scanner. This could be due to network issues, website restrictions, or API limits.',
          message: 'WebAbility scanner failed to complete the scan',
          context: [error.message] as string[],
          recommended_action: 'Please try again later or contact support if the issue persists.',
          selectors: [] as string[]
        }]
      }],
      processing_stats: {
        total_batches: 0,
        successful_batches: 0,
        failed_batches: 1,
        total_issues: 1,
        scan_error: 'WEBABILITY_API_ERROR',
        scanner_type: 'webability',
        error_details: error.message
      },
      _originalHtmlcs: {
        errors: [] as htmlcsOutput[],
        notices: [] as htmlcsOutput[],
        warnings: [] as htmlcsOutput[]
      }
    };
  }
}