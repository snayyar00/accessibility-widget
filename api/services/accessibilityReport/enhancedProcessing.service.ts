import { 
  preprocessAccessibilityIssues, 
  convertPa11yToRawIssues, 
  convertToOriginalFormat 
} from './preprocessing.service'
import { processBatches, mergeBatchResults } from './gptBatch.service'

interface EnhancedProcessingOptions {
  enablePreprocessing?: boolean
  maxConcurrency?: number
  confidenceThreshold?: number
  batchSize?: number
}

interface ProcessingResult {
  axe: { errors: any[], warnings: any[], notices: any[] }
  htmlcs: { errors: any[], warnings: any[], notices: any[] }
  ByFunctions?: any[]
  score?: number
  totalElements?: number
  processing_stats?: {
    total_batches: number
    successful_batches: number
    failed_batches: number
    total_issues: number
    preprocessing_applied: boolean
    issues_filtered: number
    issues_merged: number
    template_issues_detected: number
  }
}

interface EnhancedProcessingResult {
  processed_output: any
  processing_metadata: {
    enhanced_processing_used: boolean
    preprocessing_stats: any
    template_analysis: any
    gpt_batch_stats: any
    total_processing_time: number
    cost_savings_estimate: string
  }
}

/**
 * Enhanced accessibility processing with smart preprocessing
 * This is the main entry point for the new processing pipeline
 */
export async function processAccessibilityIssuesEnhanced(
  pa11yOutput: any,
  options: EnhancedProcessingOptions = {}
): Promise<ProcessingResult> {
  const startTime = Date.now()
  
  try {
    // Step 1: Convert pa11y format to standardized format
    const rawIssues = convertPa11yToRawIssues(pa11yOutput)
    
    // Early return if no issues to process
    if (rawIssues.length === 0) {
      return {
        axe: pa11yOutput.axe || { errors: [], warnings: [], notices: [] },
        htmlcs: pa11yOutput.htmlcs || { errors: [], warnings: [], notices: [] },
        score: pa11yOutput.score || 100,
        totalElements: pa11yOutput.totalElements || 0
      }
    }

    // Step 2: Smart preprocessing
    const preprocessingResult = preprocessAccessibilityIssues(rawIssues)
    const { batches, template_analysis, preprocessing_stats } = preprocessingResult
    
    let issuesFiltered = rawIssues.length - preprocessingResult.batches.reduce((sum, batch) => sum + batch.issues.length, 0)
    let templateIssues = template_analysis.patterns_detected.length
    let totalProcessedIssues = preprocessingResult.batches.reduce((sum, batch) => sum + batch.issues.length, 0)

    // Step 3: GPT batch processing with optimized settings
    const batchResults = await processBatches(batches)
    const successfulBatches = batchResults.filter(r => r.success).length

    // Step 4: Merge results back to original format
    const mergedResults = mergeBatchResults(batchResults)

    // Step 5: Create enhanced ByFunctions from the processed results
    const enhancedByFunctions = createEnhancedByFunctions(mergedResults)

    // Calculate processing statistics
    const processingStats = {
      total_batches: batchResults.length,
      successful_batches: successfulBatches,
      failed_batches: batchResults.length - successfulBatches,
      total_issues: mergedResults.processing_stats.total_issues,
      preprocessing_applied: true,
      issues_filtered: issuesFiltered,
      issues_merged: rawIssues.length - totalProcessedIssues,
      template_issues_detected: templateIssues
    }

    const processingTime = Date.now() - startTime

    const finalResult = {
      axe: mergedResults.axe,
      htmlcs: mergedResults.htmlcs,
      ByFunctions: enhancedByFunctions,
      score: calculateEnhancedScore(mergedResults),
      totalElements: pa11yOutput.totalElements || 0,
      processing_stats: processingStats
    }

    return finalResult

  } catch (error) {
    // Fallback to legacy processing
    const fallbackResult = await processWithLegacyMethod(pa11yOutput)
    
    return {
      ...fallbackResult,
      processing_stats: {
        total_batches: 0,
        successful_batches: 0,
        failed_batches: 1,
        total_issues: 0,
        preprocessing_applied: false,
        issues_filtered: 0,
        issues_merged: 0,
        template_issues_detected: 0
      }
    }
  }
}

/**
 * Legacy processing method for fallback
 */
async function processWithLegacyMethod(pa11yOutput: any): Promise<ProcessingResult> {
  // Import the original processing function
  const { readAccessibilityDescriptionFromDb } = await import('./accessibilityIssues.service')
  
  // Process htmlcs issues with original method
  const processedHtmlcs = await readAccessibilityDescriptionFromDb(pa11yOutput.htmlcs || { errors: [], warnings: [], notices: [] })
  
  return {
    axe: pa11yOutput.axe || { errors: [], warnings: [], notices: [] },
    htmlcs: processedHtmlcs || { errors: [], warnings: [], notices: [] },
    score: pa11yOutput.score || 0,
    totalElements: pa11yOutput.totalElements || 0
  }
}

/**
 * Calculate enhanced accessibility score based on processed issues
 */
function calculateEnhancedScore(results: any): number {
  let score = 100
  
  // Calculate penalties based on issue types and confidence scores
  const allIssues = [
    ...results.axe.errors,
    ...results.axe.warnings, 
    ...results.axe.notices,
    ...results.htmlcs.errors,
    ...results.htmlcs.warnings,
    ...results.htmlcs.notices
  ]

  allIssues.forEach(issue => {
    let penalty = 0
    
    // Base penalty by type
    if (issue.type === 'error' || results.axe.errors.includes(issue) || results.htmlcs.errors.includes(issue)) {
      penalty = 5
    } else if (issue.type === 'warning' || results.axe.warnings.includes(issue) || results.htmlcs.warnings.includes(issue)) {
      penalty = 2
    } else {
      penalty = 1
    }
    
    // Adjust penalty based on confidence score
    if (issue.confidence_score >= 80) {
      penalty *= 1.5 // High confidence issues are more impactful
    } else if (issue.confidence_score < 50) {
      penalty *= 0.5 // Low confidence issues have less impact
    }
    
    // Template issues get reduced penalty per occurrence
    if (issue.template_info?.is_template_issue) {
      penalty = penalty * 2 // Single penalty for template issue, not per occurrence
    }
    
    score -= penalty
  })
  
  return Math.max(0, Math.round(score))
}

/**
 * Enable/disable enhanced processing globally
 */
let enhancedProcessingEnabled = process.env.ENHANCED_PROCESSING_ENABLED === 'true'

export function setEnhancedProcessingEnabled(enabled: boolean): void {
  enhancedProcessingEnabled = enabled
}

export function isEnhancedProcessingEnabled(): boolean {
  return enhancedProcessingEnabled
}

/**
 * Process issues with automatic fallback handling
 */
export async function processAccessibilityIssuesWithFallback(pa11yOutput: any): Promise<ProcessingResult> {
  const options: EnhancedProcessingOptions = {
    enablePreprocessing: enhancedProcessingEnabled,
    maxConcurrency: 10,
    confidenceThreshold: 30,
    batchSize: 5
  }
  
  return processAccessibilityIssuesEnhanced(pa11yOutput, options)
}

/**
 * Enhanced processing pipeline with advanced analytics
 */
export async function processWithEnhancedPipeline(pa11yOutput: any): Promise<EnhancedProcessingResult> {
  const startTime = Date.now()
  
  try {
    // Step 1: Convert pa11y format to standardized format
    const rawIssues = convertPa11yToRawIssues(pa11yOutput)
    
    // Step 2: Advanced preprocessing with template analysis
    const preprocessingResult = preprocessAccessibilityIssues(rawIssues)
    const { batches, template_analysis, preprocessing_stats } = preprocessingResult
    
    // Step 3: GPT batch processing
    const batchResults = await processBatches(batches)
    
    // Step 4: Merge results back to original format
    const finalOutput = mergeBatchResults(batchResults)
    
    const totalTime = Date.now() - startTime
    
    // Step 5: Calculate comprehensive analytics
    const gptBatchStats = {
      total_batches: batchResults.length,
      successful_batches: batchResults.filter(r => r.success).length,
      failed_batches: batchResults.filter(r => !r.success).length,
      total_retry_attempts: batchResults.reduce((sum, r) => sum + r.retry_count, 0),
      avg_batch_size: batchResults.length > 0 ? Math.round(batchResults.reduce((sum: number, r: any) => sum + r.enhanced_issues.length, 0) / batchResults.length) : 0
    }
    
    // Enhanced cost savings calculation
    const originalIssueCount = rawIssues.length
    const processedIssueCount = finalOutput.processing_stats.total_issues
    const templateSavings = template_analysis.potential_cost_savings
    const batchingSavings = Math.max(0, originalIssueCount - gptBatchStats.total_batches)
    const totalSavings = templateSavings + batchingSavings
    const savingsPercentage = originalIssueCount > 0 ? Math.round((totalSavings / originalIssueCount) * 100) : 0
    
    const costSavingsText = `${savingsPercentage}% reduction (${totalSavings}/${originalIssueCount} GPT calls saved)`

    return {
      processed_output: finalOutput,
      processing_metadata: {
        enhanced_processing_used: true,
        preprocessing_stats,
        template_analysis,
        gpt_batch_stats: gptBatchStats,
        total_processing_time: totalTime,
        cost_savings_estimate: costSavingsText
      }
    }

  } catch (error) {
    
    // Fallback to original format with error info
    return {
      processed_output: pa11yOutput,
      processing_metadata: {
        enhanced_processing_used: false,
        preprocessing_stats: null,
        template_analysis: null,
        gpt_batch_stats: null,
        total_processing_time: Date.now() - startTime,
        cost_savings_estimate: 'Processing failed, using original output'
      }
    }
  }
}

/**
 * Create enhanced ByFunctions groups based on human functionality categories
 */
function createEnhancedByFunctions(enhancedResults: any): any[] {
  
  // Combine all enhanced issues from both runners
  const allIssues: any[] = []
  
  // Add issues from axe results
  if (enhancedResults.axe) {
    allIssues.push(...(enhancedResults.axe.errors || []))
    allIssues.push(...(enhancedResults.axe.warnings || []))
    allIssues.push(...(enhancedResults.axe.notices || []))
  }
  
  // Add issues from htmlcs results  
  if (enhancedResults.htmlcs) {
    allIssues.push(...(enhancedResults.htmlcs.errors || []))
    allIssues.push(...(enhancedResults.htmlcs.warnings || []))
    allIssues.push(...(enhancedResults.htmlcs.notices || []))
  }
  
  // Group issues by functionality based on WCAG codes and issue characteristics
  const functionalityGroups: { [key: string]: any[] } = {
    'Blind': [],
    'Low Vision': [],
    'Mobility': [],
    'Cognitive': [], 
    'Deaf/Hard of Hearing': []
  }
  
  allIssues.forEach((issue, index) => {
    const code = issue.code || issue.message || ''
    const message = issue.message || ''
    const description = issue.description || ''
    
    // Smart categorization based on WCAG codes and content
    if (code.includes('alt') || code.includes('image') || 
        code.includes('aria-label') || code.includes('screen-reader') ||
        message.includes('screen reader') || message.includes('alternative text')) {
      functionalityGroups['Blind'].push(issue)
    } 
    else if (code.includes('contrast') || code.includes('color') ||
             code.includes('focus') || message.includes('contrast') ||
             message.includes('color') || message.includes('visibility')) {
      functionalityGroups['Low Vision'].push(issue)
    }
    else if (code.includes('keyboard') || code.includes('focus') ||
             code.includes('tab') || message.includes('keyboard') ||
             message.includes('mouse') || message.includes('click')) {
      functionalityGroups['Mobility'].push(issue)
    }
    else if (code.includes('heading') || code.includes('landmark') ||
             code.includes('structure') || code.includes('navigation') ||
             message.includes('heading') || message.includes('structure') ||
             description.includes('confus') || description.includes('understand')) {
      functionalityGroups['Cognitive'].push(issue)
    }
    else if (code.includes('audio') || code.includes('video') ||
             code.includes('media') || message.includes('audio') ||
             message.includes('captions') || message.includes('transcript')) {
      functionalityGroups['Deaf/Hard of Hearing'].push(issue)
    }
    else {
      // Default to Cognitive for general accessibility issues
      functionalityGroups['Cognitive'].push(issue)
    }
  })
  
  // Convert to ByFunctions format
  const byFunctions = Object.entries(functionalityGroups)
    .filter(([, issues]) => issues.length > 0) // Only include categories with issues
    .map(([functionalityName, issues]) => ({
      FunctionalityName: functionalityName,
      Errors: issues.map(issue => ({
        code: issue.code || 'N/A',
        description: issue.description || 'Accessibility issue detected',
        message: issue.message || '',
        context: issue.context || [],
        recommended_action: issue.recommended_action || 'Review and fix this accessibility issue',
        selectors: issue.selectors || [],
        confidence_score: issue.confidence_score || 0,
        template_info: issue.template_info
      }))
    }))

  return byFunctions
} 