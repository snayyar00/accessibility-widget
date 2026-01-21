import { Request, Response } from 'express'

import logger from '../utils/logger'
import { getDeletedFixes } from '../repository/autoFixes.repository'
import type { AutoFix } from '../repository/autoFixes.repository'

// Type alias to avoid conflict with Express Response
type FetchResponse = Awaited<ReturnType<typeof fetch>>

interface ScraperApiResponse {
  status: string
  url: string
  timestamp: string
  analysis?: {
    status: string
    auto_fixes?: AutoFix[]
    summary?: {
      total_fixes: number
      by_type: {
        [key: string]: number
      }
    }
    timestamp: string
  }
  mode?: string
  correlation_id?: string
  cache_metadata?: {
    cached_at?: number
    url?: string
    cache_version?: string
    invalidation_reason?: string | null
  }
}

/**
 * Handle scraper analysis request
 * Fetches data from SCRAPPER_API_URL and returns it to the frontend
 */
export async function handleScraperAnalysis(req: Request, res: Response) {
  try {
    const { url } = req.body

    // Validate URL
    if (!url || typeof url !== 'string' || url.trim() === '') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'URL is required and must be a valid string',
      })
    }

    // Get SCRAPPER_API_URL from environment
    const scraperApiUrl = process.env.SCRAPPER_API_URL

    if (!scraperApiUrl) {
      logger.error('SCRAPPER_API_URL environment variable is not set')
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'Scraper API URL is not configured',
      })
    }

    logger.info(`Fetching scraper analysis for URL: ${url}`)

    // Call the external scraper API
    // Construct URL properly using URL constructor (like RestClient does)
    // The API uses GET request with URL as query parameter
    const endpoint = new URL('/analyze-accessibility', scraperApiUrl)
    endpoint.searchParams.set('url', url)
    const apiUrl = endpoint.toString()
    
    logger.info(`Calling scraper API at: ${apiUrl}`)
    
    // Add timeout for external API call (30 seconds)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)
    
    let apiResponse: FetchResponse
    try {
      apiResponse = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      if (fetchError.name === 'AbortError') {
        logger.error(`Scraper API timeout for URL: ${url}`)
        return res.status(504).json({
          error: 'Gateway timeout',
          message: 'The scraper API request timed out',
        })
      }
      throw fetchError
    }

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text()
      logger.error(`Scraper API error: ${apiResponse.status} - ${errorText}`)
      return res.status(apiResponse.status).json({
        error: 'External API error',
        message: `Failed to fetch analysis: ${apiResponse.status}`,
        details: process.env.NODE_ENV === 'development' ? errorText : undefined,
      })
    }

    const data = (await apiResponse.json()) as ScraperApiResponse

    logger.info(`Scraper analysis completed for URL: ${url}`)

    // Filter out deleted fixes from API response
    if (data.status === 'success' && data.analysis && data.analysis.auto_fixes) {
      try {
        const allFixes: AutoFix[] = Array.isArray(data.analysis.auto_fixes) 
          ? data.analysis.auto_fixes 
          : []
        
        // Validate fixes structure
        const validFixes = allFixes.filter(fix => 
          fix && 
          typeof fix === 'object' && 
          typeof fix.selector === 'string' && 
          fix.selector.trim().length > 0
        )
        
        if (validFixes.length !== allFixes.length) {
          logger.warn(`Filtered out ${allFixes.length - validFixes.length} invalid fixes for URL: ${url}`)
        }
        
        // Get deleted fixes from database
        const deletedFixes = await getDeletedFixes(url)
        // Normalize selectors for comparison (trim whitespace)
        const deletedSelectors = new Set(
          deletedFixes
            .filter(fix => fix && typeof fix.selector === 'string')
            .map(fix => fix.selector.trim())
        )
        
        logger.info(`Found ${deletedFixes.length} deleted fixes for URL: ${url}`)
        if (deletedFixes.length > 0) {
          logger.info(`Deleted selectors: ${Array.from(deletedSelectors).slice(0, 3).join(', ')}...`)
        }
        
        // Filter out deleted fixes from the response (normalize selectors)
        const activeFixes = validFixes.filter(fix => {
          const selector = fix.selector?.trim()
          return selector && !deletedSelectors.has(selector)
        })
        
        // Update the analysis with filtered fixes
        data.analysis.auto_fixes = activeFixes
        
        // Ensure summary exists before updating
        if (data.analysis.summary) {
          data.analysis.summary.total_fixes = activeFixes.length
          
          // Recalculate summary by type
          const byType: { [key: string]: number } = {}
          activeFixes.forEach(fix => {
            if (fix.issue_type && typeof fix.issue_type === 'string') {
              byType[fix.issue_type] = (byType[fix.issue_type] || 0) + 1
            }
          })
          data.analysis.summary.by_type = byType
        }
        
        logger.info(`Filtered ${allFixes.length} fixes to ${activeFixes.length} active fixes (${deletedFixes.length} deleted) for URL: ${url}`)
      } catch (dbError) {
        logger.error('Error filtering deleted fixes:', dbError)
        // Don't fail the request if DB query fails, just log it
        // Return original data without filtering
      }
    }

    // Return the filtered data
    return res.json(data)
  } catch (error) {
    logger.error('Error handling scraper analysis:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch scraper analysis',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
    })
  }
}
