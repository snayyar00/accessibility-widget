// Database lookup removed - WebAbility provides rich descriptions directly

interface WebAbilityIssue {
  id?: string;  // Deterministic 16-character ID
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
    viewport: [number, number] | string;
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
  id?: string;  // Deterministic 16-character ID from WebAbility
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
  id?: string;  // Deterministic 16-character ID from WebAbility
  code: string;
  message: string;
  context: string[];
  selectors: string[];
  description?: string;
  recommended_action?: string;
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
  
  // Debug first few issues to see raw data
  if (webAbilityResponse.issues.length > 0) {
    console.log('🔍 Raw WebAbility issue data (first 3):');
    webAbilityResponse.issues.slice(0, 3).forEach((issue, index) => {
      console.log(`Issue ${index}:`, {
        id: issue.id,
        message: issue.message,
        selector: issue.selector,
        context: issue.context,
        type: issue.type,
        runner: issue.runner,
        screenshotUrl: issue.screenshotUrl,
        impact: issue.runnerExtras?.impact
      });
    });
  }
  
  webAbilityResponse.issues.forEach((issue: WebAbilityIssue, index: number) => {
    // Process each issue for conversion
    
    if (issue.runner === 'axe') {
      const axeIssue: axeOutput = {
        id: issue.id,  // Preserve deterministic ID from WebAbility
        message: issue.runnerExtras?.description || issue.message.replace(/\s*\(.*$/, ''),
        context: [issue.context],
        selectors: [issue.selector],
        impact: issue.runnerExtras.impact,
        description: issue.runnerExtras?.description || issue.message,
        help: issue.runnerExtras?.help || issue.runnerExtras?.description || issue.message,
        // Enhanced WebAbility fields
        screenshotUrl: issue.screenshotUrl,
        helpUrl: issue.runnerExtras.helpUrl,
        runner: issue.runner,
        wcagLevel: extractWCAGLevel(issue.code, issue.runnerExtras.helpUrl),
      };
      
      // Created axe issue for processing

      // Map issue types to legacy categories with smart grouping that preserves screenshots
      if (issue.runnerExtras.impact === 'critical' || (issue.type === 'error' && issue.message.toLowerCase().includes('missing'))) {
        // Critical errors: missing alt text, missing labels, etc.
        const groupKey = issue.id || `${axeIssue.message.substring(0, 30)}_${issue.selector}`;
        const existingIndex = output.axe.errors.findIndex(existing => existing.id === issue.id || existing.message === axeIssue.message);
        
        if (existingIndex === -1 || issue.screenshotUrl) {
          // Add new issue OR if it has a screenshot (don't group screenshots away)
          output.axe.errors.push(axeIssue);
          console.log(`📸 Added axe error (critical) with ID:`, issue.id, 'screenshot:', !!axeIssue.screenshotUrl, 'selector:', issue.selector);
        } else {
          // Group with existing issue but preserve selectors and context
          output.axe.errors[existingIndex].context.push(...axeIssue.context);
          output.axe.errors[existingIndex].selectors.push(...axeIssue.selectors);
          console.log(`🔗 Grouped axe error (critical) - no screenshot lost`);
        }
      } else if (issue.runnerExtras.impact === 'serious' || (issue.type === 'error' && issue.message.toLowerCase().includes('contrast'))) {
        // Serious issues: contrast, discernible text, etc.
        const existingIndex = output.axe.warnings.findIndex(existing => existing.id === issue.id || existing.message === axeIssue.message);
        
        if (existingIndex === -1 || issue.screenshotUrl) {
          // Add new issue OR if it has a screenshot
          output.axe.warnings.push(axeIssue);
          console.log(`📸 Added axe warning (serious) with ID:`, issue.id, 'screenshot:', !!axeIssue.screenshotUrl, 'selector:', issue.selector);
        } else {
          // Group with existing issue
          output.axe.warnings[existingIndex].context.push(...axeIssue.context);
          output.axe.warnings[existingIndex].selectors.push(...axeIssue.selectors);
          console.log(`🔗 Grouped axe warning (serious) - no screenshot lost`);
        }
      } else if (issue.runnerExtras.impact === 'moderate' || issue.type === 'warning') {
        // Moderate issues  
        const existingIndex = output.axe.warnings.findIndex(existing => existing.id === issue.id || existing.message === axeIssue.message);
        
        if (existingIndex === -1 || issue.screenshotUrl) {
          output.axe.warnings.push(axeIssue);
          console.log(`📸 Added axe warning (moderate) with ID:`, issue.id, 'screenshot:', !!axeIssue.screenshotUrl, 'selector:', issue.selector);
        } else {
          output.axe.warnings[existingIndex].context.push(...axeIssue.context);
          output.axe.warnings[existingIndex].selectors.push(...axeIssue.selectors);
          console.log(`🔗 Grouped axe warning (moderate) - no screenshot lost`);
        }
      } else {
        // Minor issues and notices - more aggressive grouping OK since they're less critical
        const existingIndex = output.axe.notices.findIndex(existing => existing.message === axeIssue.message);
        
        if (existingIndex === -1) {
          output.axe.notices.push(axeIssue);
          console.log(`📸 Added axe notice (minor) with ID:`, issue.id, 'screenshot:', !!axeIssue.screenshotUrl, 'selector:', issue.selector);
        } else {
          output.axe.notices[existingIndex].context.push(...axeIssue.context);
          output.axe.notices[existingIndex].selectors.push(...axeIssue.selectors);
          if (issue.screenshotUrl && !output.axe.notices[existingIndex].screenshotUrl) {
            output.axe.notices[existingIndex].screenshotUrl = issue.screenshotUrl;
          }
          console.log(`🔗 Grouped axe notice (minor)`);
        }
      }
    } else {
      // Treat non-axe issues as htmlcs for compatibility
      console.log(`📝 Converting ${issue.runner} issue to htmlcs format`);
      const htmlcsIssue: htmlcsOutput = {
        id: issue.id,  // Preserve deterministic ID from WebAbility
        code: issue.code,
        message: issue.runnerExtras?.description || issue.message,
        context: [issue.context],
        selectors: [issue.selector],
        description: issue.runnerExtras?.description || issue.message,
        recommended_action: issue.runnerExtras?.help || 'Review and fix this accessibility issue according to WCAG guidelines.',
        // Enhanced WebAbility fields
        screenshotUrl: issue.screenshotUrl,
        helpUrl: issue.runnerExtras?.helpUrl,
        runner: issue.runner,
        impact: issue.runnerExtras?.impact,
        wcagLevel: extractWCAGLevel(issue.code, issue.runnerExtras?.helpUrl),
      };
      
      // Created htmlcs issue for processing

      if (issue.runnerExtras.impact === 'critical' || (issue.type === 'error' && issue.message.toLowerCase().includes('missing'))) {
        // Critical errors 
        output.htmlcs.errors.push(htmlcsIssue);
        console.log(`📸 Added htmlcs error (critical) with ID:`, issue.id, 'screenshot:', !!htmlcsIssue.screenshotUrl, 'selector:', issue.selector);
      } else if (issue.runnerExtras.impact === 'serious' || issue.runnerExtras.impact === 'moderate' || issue.type === 'warning') {
        // Serious/moderate issues
        output.htmlcs.warnings.push(htmlcsIssue);
        console.log(`📸 Added htmlcs warning with ID:`, issue.id, 'screenshot:', !!htmlcsIssue.screenshotUrl, 'selector:', issue.selector);
      } else {
        // Minor issues
        output.htmlcs.notices.push(htmlcsIssue);
        console.log(`📸 Added htmlcs notice with ID:`, issue.id, 'screenshot:', !!htmlcsIssue.screenshotUrl, 'selector:', issue.selector);
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

  // Create ByFunctions format directly from WebAbility data to avoid GPT processing data loss
  console.log('🔄 Creating ByFunctions format directly from WebAbility data');
  
  // Group issues by functionality based on their impact and type
  const functionalityGroups: { [key: string]: Error[] } = {};
  
  // AI-powered enhancement for missing data
  const enhanceIssueWithAI = (issue: WebAbilityIssue): { description: string, recommendedAction: string, functionalityName: string } => {
    const message = issue.message.toLowerCase();
    const code = issue.code.toLowerCase();
    const selector = issue.selector.toLowerCase();
    
    // Enhanced functionality mapping with AI-like intelligence
    let functionalityName = 'General Accessibility Issues';
    let description = issue.runnerExtras?.description || issue.message;
    let recommendedAction = issue.runnerExtras?.help || 'Review and fix this accessibility issue according to WCAG guidelines.';
    
    // Smart categorization and enhancement
    if (message.includes('contrast') || code.includes('contrast') || code.includes('color-contrast')) {
      functionalityName = 'Color and Contrast';
      if (!issue.runnerExtras?.description) {
        description = `Color contrast ratio is insufficient between foreground and background colors. This affects users with visual impairments and color vision deficiencies.`;
        recommendedAction = `Increase the contrast ratio to meet WCAG AA standards (4.5:1 for normal text, 3:1 for large text). Use tools like WebAIM's contrast checker to verify compliance.`;
      }
    } else if (message.includes('alt') || message.includes('image') || code.includes('image') || selector.includes('img')) {
      functionalityName = 'Images and Media';
      if (!issue.runnerExtras?.description) {
        description = `Image is missing alternative text (alt attribute), making it inaccessible to screen reader users and when images fail to load.`;
        recommendedAction = `Add descriptive alt text that conveys the purpose and content of the image. For decorative images, use alt="" to indicate they should be ignored by assistive technology.`;
      }
    } else if (message.includes('form') || message.includes('label') || code.includes('form') || selector.includes('input') || selector.includes('select')) {
      functionalityName = 'Forms and Inputs';
      if (!issue.runnerExtras?.description) {
        description = `Form control is missing a proper label or accessible name, making it difficult for screen reader users to understand its purpose.`;
        recommendedAction = `Associate form controls with descriptive labels using the <label> element or aria-label/aria-labelledby attributes. Ensure the label clearly describes the expected input.`;
      }
    } else if (message.includes('heading') || code.includes('heading') || selector.includes('h1') || selector.includes('h2') || selector.includes('h3')) {
      functionalityName = 'Content Structure';
      if (!issue.runnerExtras?.description) {
        description = `Heading structure is improper, which affects navigation for screen reader users who rely on headings to understand page hierarchy.`;
        recommendedAction = `Use headings in proper hierarchical order (h1, h2, h3, etc.) and ensure each heading accurately describes the content that follows.`;
      }
    } else if (message.includes('link') || code.includes('link') || selector.includes('a[')) {
      functionalityName = 'Navigation and Links';
      if (!issue.runnerExtras?.description) {
        description = `Link lacks sufficient context or accessible name, making it unclear to assistive technology users where the link leads.`;
        recommendedAction = `Provide descriptive link text that makes sense out of context. Avoid generic phrases like "click here" or "read more" without additional context.`;
      }
    } else if (message.includes('keyboard') || message.includes('focus') || code.includes('keyboard') || code.includes('focus')) {
      functionalityName = 'Keyboard Navigation';
      if (!issue.runnerExtras?.description) {
        description = `Element cannot be properly navigated using keyboard alone, preventing users with motor disabilities from accessing this functionality.`;
        recommendedAction = `Ensure all interactive elements are keyboard accessible with proper focus indicators and logical tab order. Use tabindex appropriately if needed.`;
      }
    } else if (message.includes('landmark') || message.includes('region') || code.includes('landmark') || code.includes('region')) {
      functionalityName = 'Page Structure';
      if (!issue.runnerExtras?.description) {
        description = `Page is missing proper landmark regions or semantic structure, making navigation difficult for screen reader users.`;
        recommendedAction = `Use semantic HTML5 elements (nav, main, aside, section, article) or ARIA landmarks to define page regions and improve screen reader navigation.`;
      }
    } else if (message.includes('aria') || code.includes('aria')) {
      functionalityName = 'ARIA and Semantics';
      if (!issue.runnerExtras?.description) {
        description = `ARIA attributes are missing, incorrect, or conflicting, which can confuse assistive technology and create barriers for users.`;
        recommendedAction = `Review ARIA implementation to ensure attributes are used correctly and provide meaningful semantic information. Follow the first rule of ARIA: don't use ARIA if native HTML can do the job.`;
      }
    } else {
      // Default based on impact level with enhanced descriptions
      if (issue.runnerExtras.impact === 'critical') {
        functionalityName = 'Critical Accessibility Issues';
        if (!issue.runnerExtras?.description) {
          description = `Critical accessibility barrier that significantly impacts users with disabilities. This issue prevents access to essential functionality.`;
          recommendedAction = `Address this issue immediately as it creates significant barriers for users with disabilities. Prioritize fixing critical issues first.`;
        }
      } else if (issue.runnerExtras.impact === 'serious') {
        functionalityName = 'Serious Accessibility Issues';
        if (!issue.runnerExtras?.description) {
          description = `Serious accessibility concern that affects usability for users with disabilities. While not blocking, this creates significant friction.`;
          recommendedAction = `Address this issue to improve accessibility. These issues affect user experience but may have workarounds.`;
        }
      } else {
        functionalityName = 'General Accessibility Issues';
        if (!issue.runnerExtras?.description) {
          description = `Accessibility improvement opportunity that enhances the experience for users with disabilities.`;
          recommendedAction = `Consider addressing this issue to improve overall accessibility and user experience.`;
        }
      }
    }
    
    return {
      description,
      recommendedAction,
      functionalityName
    };
  };
  
  // Helper function to determine functionality based on issue characteristics
  const getFunctionalityName = (issue: WebAbilityIssue): string => {
    return enhanceIssueWithAI(issue).functionalityName;
  };
  
  webAbilityResponse.issues.forEach((issue: WebAbilityIssue) => {
    // Get AI-enhanced data for this issue
    const enhancement = enhanceIssueWithAI(issue);
    
    if (!functionalityGroups[enhancement.functionalityName]) {
      functionalityGroups[enhancement.functionalityName] = [];
    }
    
    const errorItem: Error = {
      code: issue.code,
      description: enhancement.description,
      message: enhancement.description,
      context: [issue.context],
      recommended_action: enhancement.recommendedAction,
      selectors: [issue.selector],
      // Enhanced WebAbility fields
      screenshotUrl: issue.screenshotUrl,
      helpUrl: issue.runnerExtras?.helpUrl,
      runner: issue.runner,
      impact: issue.runnerExtras?.impact,
      wcagLevel: extractWCAGLevel(issue.code, issue.runnerExtras?.helpUrl),
    };
    
    functionalityGroups[enhancement.functionalityName].push(errorItem);
    
    console.log(`📋 Added AI-enhanced issue to ${enhancement.functionalityName}:`, {
      code: issue.code,
      hasDescription: !!enhancement.description,
      hasScreenshot: !!issue.screenshotUrl,
      hasSelector: !!issue.selector,
      hasContext: !!issue.context,
      aiEnhanced: !issue.runnerExtras?.description
    });
  });
  
  // Convert to ByFunctions format
  output.ByFunctions = Object.keys(functionalityGroups).map(functionality => ({
    FunctionalityName: functionality,
    Errors: functionalityGroups[functionality]
  }));
  
  console.log(`✅ Created ${output.ByFunctions.length} functionality groups with direct WebAbility data mapping`);

  // Add essential WebAbility metadata for frontend display
  output.webability_metadata = {
    job_id: webAbilityResponse.job_id,
    scan_duration: webAbilityResponse.scan_duration,
    scan_timestamp: webAbilityResponse.scan_timestamp,
    browser_info: {
      userAgent: webAbilityResponse.browser_info.userAgent,
      viewport: Array.isArray(webAbilityResponse.browser_info.viewport) ? 
        webAbilityResponse.browser_info.viewport : [1920, 1080],
      orientation: webAbilityResponse.browser_info.orientation
    },
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
    // Skip database lookup since WebAbility already provides rich descriptions
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