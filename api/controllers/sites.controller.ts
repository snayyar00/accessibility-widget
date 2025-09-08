import { Request, Response } from 'express'

import { findSiteByURL } from '../repository/sites_allowed.repository'

/**
 * Find if domain URL is added using query parameter
 * Endpoint: GET /api/sites/search?url=example.com
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

    const site = await findSiteByURL(url)

    if (!site) {
      return res.status(404).json({
        error: 'Site not found',
        message: `No site found with URL: ${url}`,
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
