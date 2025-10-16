import { getPreprocessingConfig } from '../config/preprocessing.config'
import { readAccessibilityDescriptionFromDb } from '../services/accessibilityReport/accessibilityIssues.service'
import { processAccessibilityIssuesWithFallback } from '../services/accessibilityReport/enhancedProcessing.service'

// const pa11y = require('pa11y');

interface axeOutput {
  message: string
  context: string[]
  selectors: string[]
  impact: string
  description: string
  help: string
  wcag_code?: string
  screenshotUrl?: string
  pages_affected?: string[]
}

interface htmlcsOutput {
  code: string
  message: string
  context: string[]
  selectors: string[]
  wcag_code?: string
  screenshotUrl?: string
  pages_affected?: string[]
}

interface finalOutput {
  axe: {
    errors: axeOutput[]
    notices: axeOutput[]
    warnings: axeOutput[]
  }
  htmlcs: {
    errors: htmlcsOutput[]
    notices: htmlcsOutput[]
    warnings: htmlcsOutput[]
  }
  score?: number
  totalElements: number
  siteImg?: string
  ByFunctions?: HumanFunctionality[]
  processing_stats?: any
  _originalHtmlcs?: {
    errors: htmlcsOutput[]
    notices: htmlcsOutput[]
    warnings: htmlcsOutput[]
  }
  techStack?: any
}

interface Error {
  'Error Guideline'?: string
  code?: string
  wcag_code?: string
  description?: string | string[]
  message?: string | string[]
  context?: string | string[]
  recommended_action?: string | string[]
  selectors?: string | string[]
}

interface HumanFunctionality {
  FunctionalityName: string
  Errors: Error[]
}

interface ScannerJobResponse {
  job_id: string
  status: string
}

interface ScannerStatusResponse {
  status: string
  issues?: any[]
  error?: string
}

function parseWcagCode(issue: any): string | undefined {
  // Check if the new API response contains WCAG data
  if (issue.wcagCriteria && issue.wcagLevel && issue.wcagVersion) {
    const criteria = Array.isArray(issue.wcagCriteria) ? issue.wcagCriteria[0] : issue.wcagCriteria
    return `WCAG ${issue.wcagLevel} ${issue.wcagVersion} Criteria ${criteria}`
  }

  // Fallback: try to extract from existing code field
  if (issue.code && issue.code.includes('WCAG')) {
    return issue.code
  }

  // Try to extract WCAG criteria from the code field and construct the format
  if (issue.code) {
    const wcagMatch = issue.code.match(/(\d+\.\d+\.\d+)/)
    if (wcagMatch) {
      // Default to WCAG 2.2 AA if we can't determine the level and version
      return `WCAG AA 2.2 Criteria ${wcagMatch[1]}`
    }
  }

  return undefined
}

function createAxeArrayObj(message: string, issue: any) {
  const obj: axeOutput = {
    message,
    context: [issue.context],
    selectors: [issue.selector],
    impact: issue.runnerExtras.impact,
    description: issue.runnerExtras.description,
    help: issue.runnerExtras.help,
    wcag_code: parseWcagCode(issue),
    screenshotUrl: issue.screenshotUrl || undefined,
    pages_affected: issue.pages_affected || undefined,
  }
  if (obj.screenshotUrl) {
    console.log('[AXE] Parsed screenshotUrl:', obj.screenshotUrl, 'for message:', obj.message)
  }
  return obj
}
function createHtmlcsArrayObj(issue: any) {
  const obj: htmlcsOutput = {
    code: issue.code,
    message: issue.message,
    context: [issue.context],
    selectors: [issue.selector],
    wcag_code: parseWcagCode(issue),
    screenshotUrl: issue.screenshotUrl || undefined,
    pages_affected: issue.pages_affected || undefined,
  }
  if (obj.screenshotUrl) {
    console.log('[HTMLCS] Parsed screenshotUrl:', obj.screenshotUrl, 'for message:', obj.message)
  }
  return obj
}

function calculateAccessibilityScore(issues: { errors: axeOutput[]; warnings: axeOutput[]; notices: axeOutput[] }) {
  let penalty = 0
  let minorPenalty = 0
  const totalWCAGIssues = 83
  const totalIssues = issues.errors.length + issues.warnings.length + issues.notices.length
  const weightReduction = totalIssues > 50 ? 0.4 : totalIssues > 25 ? 0.5 : 1.0
  const issueWeights: Record<string, number> = { error: 7, warning: 3, notice: 1 }
  const impactWeights: Record<string, number> = { critical: 10, serious: 7, moderate: 3, minor: 0 } // Minor now has no weight
  const passedweights = Math.max(totalWCAGIssues - totalIssues, 0) * 7

  issues.errors.forEach((issue) => {
    const impactWeight = impactWeights[issue.impact.toLowerCase()] || 0
    if (issue.impact.toLowerCase() === 'minor') {
      minorPenalty += issueWeights.error
    } else {
      penalty += issueWeights.error * impactWeight
    }
  })

  issues.warnings.forEach((issue) => {
    const impactWeight = impactWeights[issue.impact.toLowerCase()] || 0
    if (issue.impact.toLowerCase() === 'minor') {
      minorPenalty += issueWeights.warning
    } else {
      penalty += issueWeights.warning * impactWeight
    }
  })

  issues.notices.forEach((issue) => {
    const impactWeight = impactWeights[issue.impact.toLowerCase()] || 0
    if (issue.impact.toLowerCase() === 'minor') {
      minorPenalty += issueWeights.notice
    } else {
      penalty += issueWeights.notice * impactWeight
    }
  })

  // Cap minor penalty at maximum of 5 points
  const cappedMinorPenalty = Math.min(minorPenalty, 5)
  const totalPenalty = penalty + cappedMinorPenalty

  // Calculate score using the formula: Score = (Passed Weights) / (Passed Weights + Failed Weights)
  const failedWeights = totalPenalty // totalPenalty represents the failed weights
  const scoreRatio = passedweights / (passedweights + failedWeights)
  const finalScore = Math.max(10, scoreRatio * 100) // Convert ratio to 0-70 scale

  //console.log('passedweights', passedweights, 'failedWeights', failedWeights, 'minorPenalty', minorPenalty, 'cappedMinorPenalty', cappedMinorPenalty, 'finalScore', finalScore)

  // Normalize the score to a maximum of 95% (before WebAbility bonus)
  const maxScore = 95
  return Math.min(Math.floor(finalScore), maxScore)
}

export async function getAccessibilityInformationPally(domain: string, useCache?: boolean, fullSiteScan?: boolean) {
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
  }

  // Determine API URL based on scan type
  const apiUrl = `${process.env.SCANNER_SERVER_URL}/scan/full-site`

  let results

  // Helper function to check if response is empty or has zero issues
  const isEmptyResponse = (data: any) => {
    return !data || !data.issues
  }

  // Helper function to start scanner job and get job ID
  const startScannerJob = async (retryCount = 0): Promise<string> => {
    const maxRetries = 2
    const delay = 1000 * (retryCount + 1) // Exponential backoff: 1s, 2s, 3s

    try {
      const cacheStatus = useCache !== undefined ? useCache : true
      const fullSiteStatus = fullSiteScan !== undefined ? fullSiteScan : false
      console.log(`Starting scanner job (attempt ${retryCount + 1}/${maxRetries + 1})${cacheStatus ? ' - Fast scan with cache enabled' : ' - Fresh scan without cache'}${fullSiteStatus ? ' - Full site scan enabled' : ' - Single page scan'}`)
      console.log('Scanner API URL:', apiUrl)

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: domain,
          max_pages: fullSiteScan === false ? 1 : 20,
          crawl_depth: fullSiteScan === false ? 1 : 2,
          use_cache: useCache !== undefined ? useCache : true,
        }),
      })

      // Check if the response is successful
      if (!response.ok) {
        throw new Error(`Failed to start scanner job. Status: ${response.status}`)
      }

      // Parse and return the job ID
      const data = (await response.json()) as ScannerJobResponse

      if (!data.job_id) {
        throw new Error('No job_id received from scanner API')
      }

      console.log(`Scanner job started with ID: ${data.job_id}`)
      return data.job_id
    } catch (error) {
      console.error(`Scanner job start attempt ${retryCount + 1} failed:`, error)

      if (retryCount < maxRetries) {
        console.log(`Retrying scanner job start in ${delay}ms... (attempt ${retryCount + 2}/${maxRetries + 1})`)
        await new Promise((resolve) => setTimeout(resolve, delay))
        return startScannerJob(retryCount + 1)
      }

      throw error // Re-throw if max retries reached
    }
  }

  // Helper function to poll job status and get results
  const pollJobStatus = async (jobId: string): Promise<any> => {
    const maxPollingAttempts = fullSiteScan === false ? 60 : 120 // 5 minutes for single page, 10 minutes for full site scan
    const maxErrorAttempts = 5 // Limit to 5 attempts only in case of consecutive errors
    const pollingInterval = 5000 // Poll every 5 seconds
    const statusUrl = `${process.env.SCANNER_SERVER_URL}/scan/status/${jobId}`
    let errorAttempts = 0 // Track consecutive error attempts

    for (let attempt = 1; attempt <= maxPollingAttempts; attempt++) {
      try {
        console.log(`Polling job status (attempt ${attempt}/${maxPollingAttempts}) for job ID: ${jobId}`)

        const response = await fetch(statusUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to check job status. Status: ${response.status}`)
        }

        const data = (await response.json()) as ScannerStatusResponse

        // Check if job is complete
        if (data.status === 'completed' && data.issues) {
          console.log(`Job completed successfully after ${attempt} polling attempts`)
          return data
        } else if (data.status === 'failed') {
          throw new Error(`Scanner job failed: ${data.error || 'Unknown error'}`)
        } else if (data.status === 'started' || data.status === 'processing') {
          // Reset error counter only on meaningful successful responses
          errorAttempts = 0
          console.log(`Job still ${data.status}, waiting ${pollingInterval}ms before next check...`)
          await new Promise((resolve) => setTimeout(resolve, pollingInterval))
          continue
        } else if (data.status === 'not_found') {
          console.log(`Job not found (status: ${data.status}), stopping polling...`)
          throw new Error(`Scanner job not found: ${data.error || 'Job ID may be invalid or expired'}`)
        } else {
          // Reset error counter only on meaningful successful responses
          errorAttempts = 0
          console.log(`Unknown job status: ${data.status}, continuing to poll...`)
          await new Promise((resolve) => setTimeout(resolve, pollingInterval))
          continue
        }
      } catch (error) {
        errorAttempts++
        console.error(`Polling attempt ${attempt} failed (consecutive errors: ${errorAttempts}/${maxErrorAttempts}):`, error)

        // If the error is about job not found, don't retry
        if (error instanceof Error && error.message.includes('Scanner job not found')) {
          console.log('Job not found error detected, stopping polling immediately')
          throw error
        }

        // Stop polling if we've had too many consecutive errors
        if (errorAttempts >= maxErrorAttempts) {
          console.error(`Too many consecutive errors (${maxErrorAttempts}), stopping polling`)
          throw error
        }

        if (attempt === maxPollingAttempts) {
          throw error
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, pollingInterval))
      }
    }

    throw new Error(`Job did not complete within ${(maxPollingAttempts * pollingInterval) / 1000} seconds`)
  }

  try {
    // Start scanner job and get job ID
    const jobId = await startScannerJob()

    // Poll job status until completion
    results = await pollJobStatus(jobId)

    // Log all screenshotUrls found in the issues array
    if (results && typeof results === 'object' && results !== null && 'issues' in results && Array.isArray((results as any).issues)) {
      ;(results as any).issues.forEach((issue: any) => {
        if (issue.screenshotUrl) {
          console.log('[PALLY API RESPONSE] Found screenshotUrl:', issue.screenshotUrl, 'for message:', issue.message)
        }
      })
    }
  } catch (error) {
    console.error('All scanner API attempts failed, switching to fallback API:', error)
    const apiUrl2 = `${process.env.FALLBACK_PA11Y_SERVER_URL}/test`
    try {
      console.log('Using fallback pally API')
      const response = await fetch(apiUrl2, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: domain }),
      })

      // Check if the response is successful
      if (!response.ok) {
        throw new Error(`Failed to fetch screenshot. Status: ${response.status}`)
      }

      // Parse and return the response JSON
      results = await response.json()
    } catch (err) {
      console.error('fall back pally API Error', err)

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
        score: 95,
        totalElements: 0,
        ByFunctions: [],
        processing_stats: {
          total_batches: 0,
          successful_batches: 0,
          failed_batches: 1,
          total_issues: 0,
        },
      }
    }
  }

  if (results && typeof results === 'object' && results !== null && 'issues' in results && Array.isArray((results as any).issues)) {
    ;(results as any).issues.forEach((issue: any) => {
      if (issue.runner === 'axe') {
        const message = issue.message.replace(/\s*\(.*$/, '')
        if (issue.type === 'error') {
          const obj: axeOutput = createAxeArrayObj(message, issue)
          output.axe.errors.push(obj)
        } else if (issue.type === 'notice') {
          const obj: axeOutput = createAxeArrayObj(message, issue)
          output.axe.notices.push(obj)
        } else if (issue.type === 'warning') {
          const obj: axeOutput = createAxeArrayObj(message, issue)
          output.axe.warnings.push(obj)
        }
        output.totalElements += 1
      } else if (issue.runner === 'htmlcs') {
        if (issue.type === 'error') {
          const obj: htmlcsOutput = createHtmlcsArrayObj(issue)
          output.htmlcs.errors.push(obj)
        } else if (issue.type === 'notice') {
          const obj: htmlcsOutput = createHtmlcsArrayObj(issue)
          output.htmlcs.notices.push(obj)
        } else if (issue.type === 'warning') {
          const obj: htmlcsOutput = createHtmlcsArrayObj(issue)
          output.htmlcs.warnings.push(obj)
        }
      }
    })
  }

  // Extract screenshots from API response and store in siteImg (only if we don't already have a screenshot)
  if (results && typeof results === 'object' && results !== null && !output.siteImg) {
    // Check for screenshots array
    if ('screenshots' in results && Array.isArray((results as any).screenshots)) {
      const screenshots = (results as any).screenshots
      if (screenshots.length > 0) {
        // Store the first screenshot URL in siteImg, or join multiple URLs with comma
        output.siteImg = screenshots.length === 1 ? screenshots[0] : screenshots.join(',')
        console.log(`📸 Extracted ${screenshots.length} screenshot(s) from API response and stored in siteImg:`, output.siteImg)
      }
    }
    // Also check for siteImg field as fallback
    else if ('siteImg' in results && (results as any).siteImg) {
      output.siteImg = (results as any).siteImg
      console.log(`📸 Using siteImg from API response:`, output.siteImg)
    }
    // Check for any other potential screenshot fields
    else if ('screenshot' in results && (results as any).screenshot) {
      output.siteImg = (results as any).screenshot
      console.log(`📸 Using screenshot from API response:`, output.siteImg)
    }
  } else if (output.siteImg) {
    console.log(`📸 Using pre-captured screenshot (${output.siteImg.substring(0, 50)}...)`)
  }

  // Extract tech stack from API response if available
  if (results && typeof results === 'object' && results !== null) {
    if ('techStack' in results && (results as any).techStack) {
      output.techStack = (results as any).techStack
      console.log('🔧 Extracted techStack from scanner API response')
    } else if ('tech_stack' in results && (results as any).tech_stack) {
      output.techStack = (results as any).tech_stack
      console.log('🔧 Extracted tech_stack from scanner API response')
    } else if ('technology_stack' in results && (results as any).technology_stack) {
      output.techStack = (results as any).technology_stack
      console.log('🔧 Extracted technology_stack from scanner API response')
    }
    //  else {
    //   // Add dummy tech stack for testing when no tech stack is found in API response
    //   ;(results as any).techStack = {
    //     technologies: ['React', 'TypeScript', 'Node.js', 'Express'],
    //     categorizedTechnologies: [
    //       {
    //         category: 'Frontend',
    //         technologies: ['React', 'TypeScript'],
    //       },
    //       {
    //         category: 'Backend',
    //         technologies: ['Node.js', 'Express'],
    //       },
    //     ],
    //     confidence: 'high',
    //     accessibilityContext: {
    //       platform: 'Web Application',
    //       platform_type: 'SPA',
    //       has_cms: false,
    //       has_ecommerce: false,
    //       has_framework: true,
    //       is_spa: true,
    //     },
    //     analyzedUrl: domain,
    //     analyzedAt: new Date().toISOString(),
    //     source: 'dummy_data',
    //   }
    //   output.techStack = (results as any).techStack
    //   console.log('🔧 Added dummy techStack for testing')
    // }
  }

  // Get preprocessing configuration
  const config = getPreprocessingConfig()

  if (config.enabled) {
    // Use enhanced processing pipeline
    console.log('🚀 Using enhanced preprocessing pipeline')
    try {
      const enhancedResult = await processAccessibilityIssuesWithFallback(output)

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
      const originalOutput = JSON.parse(JSON.stringify(output)) // Deep clone

      // Merge enhanced results back to original format
      const finalOutput: finalOutput = {
        axe: enhancedResult.axe,
        htmlcs: enhancedResult.htmlcs,
        ByFunctions: enhancedResult.ByFunctions, // Preserve enhanced ByFunctions
        score: calculateAccessibilityScore(output.axe), // enhancedResult.score ||
        totalElements: output.totalElements,
        siteImg: output.siteImg, // Preserve screenshots
        processing_stats: enhancedResult.processing_stats,
        // Preserve original htmlcs for ByFunctions processing
        _originalHtmlcs: originalOutput.htmlcs,
        techStack: output.techStack, // Include tech stack from scanner API
      }

      console.log('📦 Final output debug:')
      console.log('   finalOutput.ByFunctions exists:', !!finalOutput.ByFunctions)
      console.log('   finalOutput.ByFunctions length:', finalOutput.ByFunctions?.length || 0)

      return finalOutput
    } catch (error) {
      console.error('❌ Enhanced processing failed, falling back to legacy:', error)
      // Continue with legacy processing below
    }
  }

  // Legacy processing path (fallback)
  console.log('⚙️ Using legacy processing pipeline')
  output.score = calculateAccessibilityScore(output.axe)
  const result = await readAccessibilityDescriptionFromDb(output.htmlcs)
  output.htmlcs = result
  return output
}
