import { Request, Response } from 'express'

import { findSiteByURL } from '../repository/sites_allowed.repository'
import { normalizeDomain } from '../utils/domain.utils'

/**
 * Find if domain URL is added using query parameter
 * Endpoint: GET /get-site?url=example.com
 */
export async function searchSiteByURL(req: Request, res: Response): Promise<Response> {
  try {
    const { url } = req.query

    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        error: 'URL query parameter is required',
        message: 'Please provide a valid URL in the query parameters',
      })
    }

    const normalized = normalizeDomain(url)
    if (!normalized) {
      return res.status(400).json({
        error: 'Invalid URL',
        message: 'Please provide a valid domain or URL in the "url" query parameter',
      })
    }

    const site = await findSiteByURL(normalized)

    if (!site) {
      return res.status(404).json({
        error: 'Site not found',
        message: `No site found with URL: ${normalized}`,
      })
    }

    return res.json({
      success: true,
    })
  } catch (error) {
    console.error('Error searching site by URL:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while searching for the site',
    })
  }
}
