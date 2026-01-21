import { Request, Response } from 'express'

import logger from '../utils/logger'
import {
  findAutoFixesByUrl,
  updateDeletedFixes,
  deleteAutoFixes,
} from '../repository/autoFixes.repository'
import type { AutoFix } from '../repository/autoFixes.repository'

/**
 * Get deleted fixes for a URL
 */
export async function getDeletedFixesHandler(req: Request, res: Response) {
  try {
    const { url } = req.query

    if (!url || typeof url !== 'string' || url.trim() === '') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'URL query parameter is required',
      })
    }

    const record = await findAutoFixesByUrl(url)

    if (!record || !record.deleted_fixes || record.deleted_fixes.length === 0) {
      return res.json({
        success: true,
        data: {
          url,
          deleted_fixes: [],
        },
      })
    }

    return res.json({
      success: true,
      data: {
        url: record.url,
        deleted_fixes: record.deleted_fixes,
      },
    })
  } catch (error) {
    logger.error('Error getting deleted fixes:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get deleted fixes',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
    })
  }
}


/**
 * Update deleted fixes (fixes user doesn't want)
 */
export async function updateDeletedFixesHandler(req: Request, res: Response) {
  try {
    const { url, deleted_fixes } = req.body

    if (!url || typeof url !== 'string' || url.trim() === '') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'URL is required',
      })
    }

    if (!Array.isArray(deleted_fixes)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'deleted_fixes must be an array',
      })
    }

    // Validate AutoFix structure
    const validFixes = deleted_fixes.filter((fix: any) => 
      fix &&
      typeof fix === 'object' &&
      typeof fix.selector === 'string' &&
      fix.selector.trim().length > 0 &&
      typeof fix.action === 'string' &&
      typeof fix.issue_type === 'string' &&
      fix.attributes &&
      typeof fix.attributes === 'object'
    )

    if (validFixes.length !== deleted_fixes.length) {
      logger.warn(`Filtered out ${deleted_fixes.length - validFixes.length} invalid fixes`)
    }

    const updated = await updateDeletedFixes(url, validFixes as AutoFix[])

    logger.info(`Updated deleted fixes for URL: ${url} - ${deleted_fixes.length} deleted fixes stored`)

    return res.json({
      success: true,
      data: updated,
    })
  } catch (error) {
    logger.error('Error updating deleted fixes:', error)
    
    if ((error as Error).message.includes('not found')) {
      return res.status(404).json({
        error: 'Not found',
        message: (error as Error).message,
      })
    }

    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update deleted fixes',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
    })
  }
}

/**
 * Delete auto fixes record
 */
export async function deleteAutoFixesHandler(req: Request, res: Response) {
  try {
    const { url } = req.body

    if (!url || typeof url !== 'string' || url.trim() === '') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'URL is required',
      })
    }

    await deleteAutoFixes(url)

    logger.info(`Deleted auto fixes for URL: ${url}`)

    return res.json({
      success: true,
      message: 'Auto fixes deleted successfully',
    })
  } catch (error) {
    logger.error('Error deleting auto fixes:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete auto fixes',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
    })
  }
}
