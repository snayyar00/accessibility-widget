import { Request, Response } from 'express'

import { findSiteByURL } from '../repository/sites_allowed.repository'
import { checkScript } from '../services/allowedSites/allowedSites.service'

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

/**
 * Check if accessibility widget script is installed on a site
 * Endpoint: POST /check-script
 * Body: { siteUrl: string }
 */
export async function checkSiteScript(req: Request, res: Response): Promise<Response> {
  try {
    const { siteUrl } = req.body

    if (!siteUrl || typeof siteUrl !== 'string') {
      return res.status(400).json({
        error: 'siteUrl is required',
        message: 'Please provide a valid siteUrl in the request body',
      })
    }

    const result = await checkScript(siteUrl)
    return res.json({ result })
  } catch (error: any) {
    console.error('Error checking script:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'An error occurred while checking for the script',
    })
  }
}
