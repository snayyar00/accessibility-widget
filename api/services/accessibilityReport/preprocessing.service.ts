import { TemplateAnalysisService } from './templateAnalysis.service'

interface RawIssue {
  code: string
  message: string
  context: string[]
  selectors: string[]
  type: 'error' | 'warning' | 'notice'
  runner: 'axe' | 'htmlcs'
  impact?: string
  help?: string
  screenshotUrl?: string
}

interface ProcessedIssue extends RawIssue {
  confidence_score: number
  merged_from: number
  runners: string[]
  template_info?: {
    is_template_issue: boolean
    occurrence_count: number
    fix_scope: 'theme_level' | 'component_level' | 'content_level'
  }
  processing_metadata: {
    runners: string[]
    merged_from: number
    partial?: boolean
    runner_agreement?: boolean
  }
  screenshotUrl?: string
}

interface GroupedIssue {
  groupKey: string
  issues: RawIssue[]
  isTemplate: boolean
  occurrence_count: number
}

interface BatchedIssues {
  batch_id: string
  issues: ProcessedIssue[]
}

// Critical issues that should always be processed regardless of confidence score
const CRITICAL_ISSUES = ['button-name', 'link-name', 'color-contrast', 'meta-viewport', 'keyboard-trap', 'aria-hidden-focus']

/**
 * Rule-based confidence scoring - Less aggressive, more inclusive version
 */
function calculateConfidenceScore(issue: RawIssue): number {
  let score = 25 // Higher base score - every detected issue has some value

  // Selector quality scoring - more generous
  const selector = issue.selectors[0] || ''
  if (selector.trim()) {
    score += 15 // Reduced penalty for having any selector

    // ID selectors are very reliable (+15)
    if (selector.includes('#')) {
      score += 15
    }
    // ANY class selector is valuable (+10, was more restrictive)
    else if (selector.includes('.')) {
      score += 10
    }
    // Element selectors are still useful (+8)
    else if (selector.match(/^[a-zA-Z]+/)) {
      score += 8
    }
  } else {
    // Don't penalize missing selectors as much - still accessibility issues
    score += 5 // Some value even without selectors
  }

  // Context quality scoring - be more generous
  const contextStr = issue.context.join(' ')
  if (contextStr.length > 10) {
    // Lowered threshold
    score += 10

    // HTML tags in context indicate real content
    if (/<[^>]+>/.test(contextStr)) {
      score += 10
    }

    // Any meaningful text content
    if (contextStr.replace(/<[^>]*>/g, '').trim().length > 10) {
      score += 10
    }
  }

  // Issue type reliability - more inclusive
  if (issue.code) {
    // Valid WCAG codes are high quality
    if (/WCAG2A{1,2}/.test(issue.code)) {
      score += 15
    }

    // Any meaningful issue code gets points
    if (issue.code.length > 3) {
      // Lowered from 8
      score += 8
    }

    // Well-known accessibility patterns
    if (isHighConfidenceIssueType(issue.code)) {
      score += 20
    }
  }

  // Message quality - more forgiving
  if (issue.message && issue.message.length > 10) {
    // Lowered threshold
    score += 10

    // Messages with recommendations get bonus
    if (issue.message.toLowerCase().includes('recommend') || issue.message.toLowerCase().includes('should') || issue.message.toLowerCase().includes('must')) {
      score += 8
    }
  }

  // Runner-specific bonuses
  if (issue.runner === 'axe') {
    score += 5

    // Axe impact levels
    if (issue.impact === 'critical') score += 15
    else if (issue.impact === 'serious') score += 12
    else if (issue.impact === 'moderate') score += 8
    else if (issue.impact === 'minor') score += 5

    // Axe help text
    if (issue.help && issue.help.length > 10) {
      score += 5
    }
  }

  // Critical accessibility issues always get high scores
  if (CRITICAL_ISSUES.some((critical) => issue.code?.toLowerCase().includes(critical.toLowerCase()))) {
    score += 25
  }

  return Math.min(score, 150)
}

/**
 * Check if issue type is known to be high-confidence
 */
function isHighConfidenceIssueType(code: string): boolean {
  const lowCodeStr = code.toLowerCase()

  // High-confidence issue patterns
  const highConfidencePatterns = [
    'color-contrast',
    'contrast',
    'alt-text',
    'image-alt',
    'img-alt',
    'label',
    'form-label',
    'input-label',
    'heading',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'focus',
    'keyboard',
    'tab',
    'aria-label',
    'aria-labelledby',
    'aria-describedby',
    'button-name',
    'link-name',
    'skip-link',
    'landmark',
    'duplicate-id',
    'meta-viewport',
  ]

  return highConfidencePatterns.some((pattern) => lowCodeStr.includes(pattern))
}

/**
 * Process grouped issues into final format - Less aggressive filtering
 */
function processGroupedIssues(groupedIssues: GroupedIssue[]): ProcessedIssue[] {
  const processedIssues: ProcessedIssue[] = []
  const debugMode = process.env.PREPROCESSING_DEBUG_MODE === 'true'
  const confidenceThreshold = parseInt(process.env.PREPROCESSING_CONFIDENCE_THRESHOLD || '15') // Lowered from 20
  let filteredCount = 0
  let runnerAgreements = 0

  groupedIssues.forEach((group) => {
    const representative = group.issues[0]
    const confidence_score = calculateConfidenceScore(representative)

    // Check if critical (never filter these)
    const isCritical = CRITICAL_ISSUES.some((critical) => representative.code?.includes(critical))

    // More lenient filtering - only filter very low scores
    const shouldFilter = confidence_score < confidenceThreshold && !isCritical

    if (debugMode) {
      const groupInfo = group.isTemplate ? `Template(${group.occurrence_count})` : group.occurrence_count > 1 ? `Merged(${group.occurrence_count})` : 'Single'

      console.log(`🔍 ${groupInfo} | ${representative.code?.substring(0, 30)}... | Score: ${confidence_score} | Critical: ${isCritical} | ${shouldFilter ? '❌ FILTERED' : '✅ KEPT'}`)

      if (shouldFilter) {
        console.log(`   📝 Filtered reason: Score ${confidence_score} < threshold ${confidenceThreshold}`)
        console.log(`   🔍 Selector: "${representative.selectors[0] || 'none'}"`)
        console.log(`   💬 Message: "${representative.message?.substring(0, 80)}..."`)
      }
    }

    if (shouldFilter) {
      filteredCount++
      return // Skip this issue
    }

    // Detect runner agreement and calculate bonus
    const allRunners = [...new Set(group.issues.map((issue) => issue.runner))]
    const hasRunnerAgreement = allRunners.length > 1
    const runnerAgreementBonus = hasRunnerAgreement ? 15 : 0

    if (hasRunnerAgreement) {
      runnerAgreements++
      if (debugMode) {
        console.log(`🤝 Runner agreement: ${allRunners.join(' + ')} (+${runnerAgreementBonus} points)`)
      }
    }

    const processedIssue: ProcessedIssue = {
      ...representative,
      confidence_score: confidence_score + runnerAgreementBonus,
      merged_from: group.occurrence_count,
      runners: allRunners,
      processing_metadata: {
        runners: allRunners,
        merged_from: group.occurrence_count,
        runner_agreement: hasRunnerAgreement,
      },
      screenshotUrl: representative.screenshotUrl,
    }
    if (processedIssue.screenshotUrl) {
      console.log('[processGroupedIssues] Preserved screenshotUrl:', processedIssue.screenshotUrl, 'for message:', processedIssue.message)
    }

    // Add template info if applicable
    if (group.isTemplate) {
      processedIssue.template_info = {
        is_template_issue: true,
        occurrence_count: group.occurrence_count,
        fix_scope: determineFixScope(group.occurrence_count),
      }
    }

    processedIssues.push(processedIssue)
  })

  if (debugMode) {
    console.log('📊 Processing summary:')
    console.log(`   ${filteredCount} issues filtered (${Math.round((filteredCount / groupedIssues.length) * 100)}%)`)
    console.log(`   ${processedIssues.length} issues kept (${Math.round((processedIssues.length / groupedIssues.length) * 100)}%)`)
    console.log(`   ${runnerAgreements} runner agreements detected`)

    if (filteredCount > 0) {
      console.log("⚠️  To see what's being filtered, check the logs above or lower PREPROCESSING_CONFIDENCE_THRESHOLD")
    }
  }

  return processedIssues
}

/**
 * Determine fix scope based on occurrence count
 */
function determineFixScope(count: number): 'theme_level' | 'component_level' | 'content_level' {
  if (count >= 10) return 'theme_level'
  if (count >= 5) return 'component_level'
  return 'content_level'
}

/**
 * Create batches of issues for GPT processing - Optimized for quality + speed balance
 */
function createBatches(issues: ProcessedIssue[]): BatchedIssues[] {
  const batches: BatchedIssues[] = []

  // Smaller batches for better quality control
  let batchSize = 5 // Sweet spot: quality + speed

  // Slightly larger batches only for very high confidence issues
  if (issues.length > 50) {
    batchSize = 6
  } else if (issues.length > 100) {
    batchSize = 8
  }

  // Separate by confidence for targeted processing
  const highConfidenceIssues = issues.filter((issue) => issue.confidence_score >= 100)
  const mediumConfidenceIssues = issues.filter((issue) => issue.confidence_score >= 70 && issue.confidence_score < 100)
  const lowConfidenceIssues = issues.filter((issue) => issue.confidence_score < 70)

  // Process high confidence with standard batches
  for (let i = 0; i < highConfidenceIssues.length; i += batchSize) {
    const batch = highConfidenceIssues.slice(i, i + batchSize)
    batches.push({
      batch_id: `high_${Math.floor(i / batchSize) + 1}`,
      issues: batch,
    })
  }

  // Medium confidence with slightly smaller batches for attention
  const mediumBatchSize = Math.max(batchSize - 1, 4)
  for (let i = 0; i < mediumConfidenceIssues.length; i += mediumBatchSize) {
    const batch = mediumConfidenceIssues.slice(i, i + mediumBatchSize)
    batches.push({
      batch_id: `med_${Math.floor(i / mediumBatchSize) + 1}`,
      issues: batch,
    })
  }

  // Low confidence with smaller batches for more careful analysis
  const lowBatchSize = Math.max(batchSize - 2, 3)
  for (let i = 0; i < lowConfidenceIssues.length; i += lowBatchSize) {
    const batch = lowConfidenceIssues.slice(i, i + lowBatchSize)
    batches.push({
      batch_id: `low_${Math.floor(i / lowBatchSize) + 1}`,
      issues: batch,
    })
  }

  return batches
}

/**
 * Main preprocessing function with advanced template analysis
 */
export function preprocessAccessibilityIssues(rawIssues: RawIssue[]): {
  batches: BatchedIssues[]
  template_analysis: any
  preprocessing_stats: any
} {
  const startTime = Date.now()
  const debugMode = process.env.PREPROCESSING_DEBUG_MODE === 'true'

  if (debugMode) {
    console.log(`🚀 Enhanced preprocessing starting with ${rawIssues.length} raw issues`)
  }

  // Step 1: Advanced template analysis for big sites
  const templateAnalysis = TemplateAnalysisService.analyzeTemplatePatterns(rawIssues)

  // Step 2: Smart deduplication - DISABLED
  // const groupedIssues = deduplicateIssues(rawIssues)
  const groupedIssues = rawIssues.map((issue) => ({
    groupKey: issue.code + issue.message,
    issues: [issue],
    isTemplate: false,
    occurrence_count: 1,
  }))

  // Step 3: Process groups (confidence scoring, filtering)
  const processedIssues = processGroupedIssues(groupedIssues)

  // Step 4: Sort by confidence score (highest first)
  processedIssues.sort((a, b) => b.confidence_score - a.confidence_score)

  // Step 5: Create batches for GPT processing
  const batches = createBatches(processedIssues)

  const processingTime = Date.now() - startTime

  // Step 6: Generate comprehensive stats
  const preprocessingStats = {
    raw_issues_count: rawIssues.length,
    processed_issues_count: processedIssues.length,
    batches_created: batches.length,
    processing_time_ms: processingTime,
    template_patterns_detected: templateAnalysis.patterns_detected.length,
    template_issues_count: templateAnalysis.total_template_issues,
    potential_template_savings: templateAnalysis.potential_cost_savings,
    avg_confidence_score: Math.round(processedIssues.reduce((sum, issue) => sum + issue.confidence_score, 0) / (processedIssues.length || 1)),
    confidence_distribution: calculateConfidenceDistribution(processedIssues),
    runner_breakdown: calculateRunnerBreakdown(processedIssues),
  }

  if (debugMode) {
    console.log(`📊 Enhanced preprocessing completed in ${processingTime}ms`)
    console.log(`   ${rawIssues.length} → ${processedIssues.length} issues (${batches.length} batches)`)
    console.log(`   ${templateAnalysis.patterns_detected.length} template patterns detected`)
    console.log(`   Avg confidence: ${preprocessingStats.avg_confidence_score}`)
  }

  return {
    batches,
    template_analysis: templateAnalysis,
    preprocessing_stats: preprocessingStats,
  }
}

/**
 * Calculate confidence score distribution
 */
function calculateConfidenceDistribution(issues: ProcessedIssue[]): Record<string, number> {
  const distribution = {
    'critical_120+': 0,
    'high_90-119': 0,
    'medium_60-89': 0,
    'low_<60': 0,
  }

  issues.forEach((issue) => {
    if (issue.confidence_score >= 120) distribution['critical_120+']++
    else if (issue.confidence_score >= 90) distribution['high_90-119']++
    else if (issue.confidence_score >= 60) distribution['medium_60-89']++
    else distribution['low_<60']++
  })

  return distribution
}

/**
 * Calculate runner breakdown statistics
 */
function calculateRunnerBreakdown(issues: ProcessedIssue[]): Record<string, number> {
  const breakdown = { axe_only: 0, htmlcs_only: 0, both_runners: 0 }

  issues.forEach((issue) => {
    if (issue.runners.includes('axe') && issue.runners.includes('htmlcs')) {
      breakdown.both_runners++
    } else if (issue.runners.includes('axe')) {
      breakdown.axe_only++
    } else {
      breakdown.htmlcs_only++
    }
  })

  return breakdown
}

/**
 * Convert current pa11y format to our RawIssue format
 * The input comes from accessibility.helper.ts which already groups issues by runner and type
 */
export function convertPa11yToRawIssues(pa11yOutput: any): RawIssue[] {
  const rawIssues: RawIssue[] = []

  // Debug: Log the input format to understand what we're getting
  const debugMode = process.env.PREPROCESSING_DEBUG_MODE === 'true'
  if (debugMode) {
    console.log('🔍 PA11Y input format check:')
    console.log('   axe errors:', pa11yOutput.axe?.errors?.length || 0)
    console.log('   axe warnings:', pa11yOutput.axe?.warnings?.length || 0)
    console.log('   axe notices:', pa11yOutput.axe?.notices?.length || 0)
    console.log('   htmlcs errors:', pa11yOutput.htmlcs?.errors?.length || 0)
    console.log('   htmlcs warnings:', pa11yOutput.htmlcs?.warnings?.length || 0)
    console.log('   htmlcs notices:', pa11yOutput.htmlcs?.notices?.length || 0)
  }

  // Process axe issues - these come already grouped
  if (pa11yOutput.axe) {
    ;['errors', 'warnings', 'notices'].forEach((type) => {
      if (pa11yOutput.axe[type] && Array.isArray(pa11yOutput.axe[type])) {
        pa11yOutput.axe[type].forEach((issue: any) => {
          if (issue.screenshotUrl) {
            console.log('[convertPa11yToRawIssues][AXE]', type, 'screenshotUrl:', issue.screenshotUrl, 'message:', issue.message)
          }
          rawIssues.push({
            code: issue.message || '',
            message: issue.message || '',
            context: Array.isArray(issue.context) ? issue.context : [issue.context].filter(Boolean),
            selectors: Array.isArray(issue.selectors) ? issue.selectors : [issue.selectors].filter(Boolean),
            type: type.slice(0, -1) as 'error' | 'warning' | 'notice', // Remove 's'
            runner: 'axe',
            impact: issue.impact,
            help: issue.help,
            screenshotUrl: issue.screenshotUrl || undefined,
          })
        })
      }
    })
  }

  // Process htmlcs issues - these come already grouped
  if (pa11yOutput.htmlcs) {
    ;['errors', 'warnings', 'notices'].forEach((type) => {
      if (pa11yOutput.htmlcs[type] && Array.isArray(pa11yOutput.htmlcs[type])) {
        pa11yOutput.htmlcs[type].forEach((issue: any) => {
          if (issue.screenshotUrl) {
            console.log('[convertPa11yToRawIssues][HTMLCS]', type, 'screenshotUrl:', issue.screenshotUrl, 'message:', issue.message)
          }
          rawIssues.push({
            code: issue.code || issue.message || '',
            message: issue.message || '',
            context: Array.isArray(issue.context) ? issue.context : [issue.context].filter(Boolean),
            selectors: Array.isArray(issue.selectors) ? issue.selectors : [issue.selectors].filter(Boolean),
            type: type.slice(0, -1) as 'error' | 'warning' | 'notice', // Remove 's'
            runner: 'htmlcs',
            screenshotUrl: issue.screenshotUrl || undefined,
          })
        })
      }
    })
  }

  if (debugMode) {
    console.log(`📊 Converted ${rawIssues.length} total raw issues`)
    console.log(`   axe: ${rawIssues.filter((i) => i.runner === 'axe').length}`)
    console.log(`   htmlcs: ${rawIssues.filter((i) => i.runner === 'htmlcs').length}`)
  }

  return rawIssues
}

/**
 * Convert processed issues back to original format for compatibility
 */
export function convertToOriginalFormat(processedIssues: ProcessedIssue[]): any {
  const result = {
    axe: { errors: [] as any[], warnings: [] as any[], notices: [] as any[] },
    htmlcs: { errors: [] as any[], warnings: [] as any[], notices: [] as any[] },
  }

  processedIssues.forEach((issue) => {
    const targetRunner = issue.runner === 'axe' ? 'axe' : 'htmlcs'
    const targetType = `${issue.type}s` // Add 's' back

    // Convert back to original format while preserving new fields
    const convertedIssue: any = {
      code: issue.code,
      message: issue.message,
      context: issue.context,
      selectors: issue.selectors,
      confidence_score: issue.confidence_score,
      template_info: issue.template_info,
      processing_metadata: issue.processing_metadata,
    }

    // Add optional fields if they exist
    if (issue.impact) convertedIssue.impact = issue.impact
    if (issue.help) convertedIssue.help = issue.help
    if (issue.screenshotUrl) convertedIssue.screenshotUrl = issue.screenshotUrl

    // Use bracket notation to avoid TypeScript indexing issues
    const targetArray = (result as any)[targetRunner][targetType] as any[]
    targetArray.push(convertedIssue)
  })

  return result
}
