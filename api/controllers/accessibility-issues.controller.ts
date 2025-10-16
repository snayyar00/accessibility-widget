import { Request, Response } from 'express'

import {
  deleteAccessibilityIssueById,
  deleteAccessibilityIssuesBySession,
  getAccessibilityDatabaseStats,
  getAccessibilityIssueById,
  getAccessibilityIssuesBySession,
  getAccessibilityIssuesByUrl,
  getUnappliedAccessibilityIssues,
  updateAccessibilityIssueStatus,
} from '../repository/accessibility_issues.repository'

/**
 * Get database statistics for accessibility issues.
 * GET /api/accessibility-issues/stats
 */
export async function getAccessibilityStatistics(req: Request, res: Response): Promise<Response> {
  try {
    const stats = await getAccessibilityDatabaseStats()

    return res.json({
      status: 'success',
      statistics: stats,
    })
  } catch (error) {
    console.error('Error fetching accessibility statistics:', error)
    return res.status(500).json({
      status: 'error',
      error: 'Internal server error',
      message: 'Failed to fetch accessibility statistics',
    })
  }
}

/**
 * Get all accessibility issues for a specific test session.
 * GET /api/accessibility-issues/session/:urlid
 */
export async function getIssuesBySession(req: Request, res: Response): Promise<Response> {
  try {
    const { urlid } = req.params

    if (!urlid) {
      return res.status(400).json({
        status: 'error',
        error: 'Missing parameter',
        message: 'Session ID (urlid) is required',
      })
    }

    const issues = await getAccessibilityIssuesBySession(urlid)

    return res.json({
      status: 'success',
      session_id: urlid,
      total_issues: issues.length,
      issues,
    })
  } catch (error) {
    console.error('Error fetching issues by session:', error)
    return res.status(500).json({
      status: 'error',
      error: 'Internal server error',
      message: 'Failed to fetch issues by session',
    })
  }
}

/**
 * Get all accessibility issues for a specific URL.
 * GET /api/accessibility-issues/url?url=https://example.com
 */
export async function getIssuesByUrl(req: Request, res: Response): Promise<Response> {
  try {
    const { url } = req.query

    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        status: 'error',
        error: 'Missing parameter',
        message: 'URL query parameter is required',
      })
    }

    const issues = await getAccessibilityIssuesByUrl(url)

    return res.json({
      status: 'success',
      url,
      total_issues: issues.length,
      issues,
    })
  } catch (error) {
    console.error('Error fetching issues by URL:', error)
    return res.status(500).json({
      status: 'error',
      error: 'Internal server error',
      message: 'Failed to fetch issues by URL',
    })
  }
}

/**
 * Get all unapplied (pending) accessibility issues.
 * GET /api/accessibility-issues/unapplied?urlid=optional-session-id
 */
export async function getUnappliedIssues(req: Request, res: Response): Promise<Response> {
  try {
    const { urlid } = req.query

    const issues = await getUnappliedAccessibilityIssues(urlid && typeof urlid === 'string' ? urlid : undefined)

    return res.json({
      status: 'success',
      total_unapplied: issues.length,
      issues,
    })
  } catch (error) {
    console.error('Error fetching unapplied issues:', error)
    return res.status(500).json({
      status: 'error',
      error: 'Internal server error',
      message: 'Failed to fetch unapplied issues',
    })
  }
}

/**
 * Get a specific issue by ID.
 * GET /api/accessibility-issues/:id
 */
export async function getIssueById(req: Request, res: Response): Promise<Response> {
  try {
    const { id } = req.params

    if (!id) {
      return res.status(400).json({
        status: 'error',
        error: 'Missing parameter',
        message: 'Issue ID is required',
      })
    }

    const issue = await getAccessibilityIssueById(id)

    if (!issue) {
      return res.status(404).json({
        status: 'error',
        error: 'Not found',
        message: `Issue with ID ${id} not found`,
      })
    }

    return res.json({
      status: 'success',
      issue,
    })
  } catch (error) {
    console.error('Error fetching issue by ID:', error)
    return res.status(500).json({
      status: 'error',
      error: 'Internal server error',
      message: 'Failed to fetch issue',
    })
  }
}

/**
 * Update the status of an accessibility issue.
 * PATCH /api/accessibility-issues/:id
 * Body: { "is_applied": true }
 */
export async function updateIssueStatus(req: Request, res: Response): Promise<Response> {
  try {
    const { id } = req.params
    const { is_applied } = req.body

    if (!id) {
      return res.status(400).json({
        status: 'error',
        error: 'Missing parameter',
        message: 'Issue ID is required',
      })
    }

    if (typeof is_applied !== 'boolean') {
      return res.status(400).json({
        status: 'error',
        error: 'Invalid parameter',
        message: 'is_applied must be a boolean value',
      })
    }

    const success = await updateAccessibilityIssueStatus(id, is_applied)

    if (!success) {
      return res.status(404).json({
        status: 'error',
        error: 'Not found',
        message: `Issue with ID ${id} not found`,
      })
    }

    return res.json({
      status: 'success',
      message: `Issue ${id} updated successfully`,
      is_applied,
    })
  } catch (error) {
    console.error('Error updating issue status:', error)
    return res.status(500).json({
      status: 'error',
      error: 'Internal server error',
      message: 'Failed to update issue status',
    })
  }
}

/**
 * Delete all issues for a specific test session.
 * DELETE /api/accessibility-issues/session/:urlid
 */
export async function deleteSessionIssues(req: Request, res: Response): Promise<Response> {
  try {
    const { urlid } = req.params

    if (!urlid) {
      return res.status(400).json({
        status: 'error',
        error: 'Missing parameter',
        message: 'Session ID (urlid) is required',
      })
    }

    const deletedCount = await deleteAccessibilityIssuesBySession(urlid)

    return res.json({
      status: 'success',
      message: `Deleted ${deletedCount} issues from session ${urlid}`,
      deleted_count: deletedCount,
    })
  } catch (error) {
    console.error('Error deleting session issues:', error)
    return res.status(500).json({
      status: 'error',
      error: 'Internal server error',
      message: 'Failed to delete session issues',
    })
  }
}

/**
 * Delete a specific issue by ID.
 * DELETE /api/accessibility-issues/:id
 */
export async function deleteIssue(req: Request, res: Response): Promise<Response> {
  try {
    const { id } = req.params

    if (!id) {
      return res.status(400).json({
        status: 'error',
        error: 'Missing parameter',
        message: 'Issue ID is required',
      })
    }

    const deletedCount = await deleteAccessibilityIssueById(id)

    if (deletedCount === 0) {
      return res.status(404).json({
        status: 'error',
        error: 'Not found',
        message: `Issue with ID ${id} not found`,
      })
    }

    return res.json({
      status: 'success',
      message: `Issue ${id} deleted successfully`,
    })
  } catch (error) {
    console.error('Error deleting issue:', error)
    return res.status(500).json({
      status: 'error',
      error: 'Internal server error',
      message: 'Failed to delete issue',
    })
  }
}
