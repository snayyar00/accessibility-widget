import { ValidationError } from '../../utils/graphql-errors.helper'
import logger from '../../utils/logger'
import { normalizeDomain } from '../../utils/domain.utils'

export interface DomainAnalysisResult {
  url: string
  status: string
  insights?: any
  error?: string
  timestamp: Date
}

/**
 * Analyze domain using external API
 *
 * @param {string} domain - Domain URL to analyze
 * @returns {Promise<DomainAnalysisResult>}
 */
export async function analyzeDomain(domain: string): Promise<DomainAnalysisResult> {
  try {
    // Validate and normalize the domain
    if (!domain || typeof domain !== 'string') {
      throw new ValidationError('Domain is required and must be a valid string')
    }

    const normalizedDomain = normalizeDomain(domain)

    if (!normalizedDomain) {
      throw new ValidationError('Invalid domain format')
    }

    logger.info(`Starting domain analysis for: ${normalizedDomain}`)

    // Call the external analysis API
    const apiUrl = `${process.env.AI_HEATMAP_SCANNER_API}/analyze`

    // Create FormData for multipart/form-data request
    const formData = new FormData()
    formData.append('url', normalizedDomain)
    formData.append('include_legend', 'false')

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
      },
      body: formData,
    })

    if (!response.ok) {
      logger.error(`Domain analysis API failed with status: ${response.status}`)
      throw new Error(`Analysis API returned status: ${response.status}`)
    }

    const analysisData = (await response.json()) as any

    logger.info(`Domain analysis completed for: ${normalizedDomain}`)

    // Check if the nested insights status indicates success
    const insightsStatus = analysisData?.status
    const isSuccessful = insightsStatus === 'success'

    return {
      url: normalizedDomain,
      status: isSuccessful ? 'success' : 'error',
      insights: analysisData,
      timestamp: new Date(),
      ...(!isSuccessful && analysisData?.error && { error: analysisData.error }),
    }
  } catch (error) {
    logger.error('Domain analysis failed:', error)

    return {
      url: domain,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date(),
    }
  }
}

/**
 * Validate domain format before analysis
 *
 * @param {string} domain - Domain to validate
 * @returns {boolean}
 */
export function validateDomainForAnalysis(domain: string): boolean {
  if (!domain || typeof domain !== 'string') {
    return false
  }

  // Basic URL validation
  try {
    const url = domain.startsWith('http') ? domain : `https://${domain}`
    new URL(url)
    return true
  } catch {
    return false
  }
}
