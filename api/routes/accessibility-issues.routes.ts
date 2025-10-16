import { Router } from 'express'

import { deleteIssue, deleteSessionIssues, getAccessibilityStatistics, getIssueById, getIssuesBySession, getIssuesByUrl, getUnappliedIssues, updateIssueStatus } from '../controllers/accessibility-issues.controller'
import { authenticateApiKey } from '../middlewares/auth.middleware'
import { moderateLimiter } from '../middlewares/limiters.middleware'

const router = Router()

// Statistics endpoint
router.get('/accessibility-issues/stats', moderateLimiter, authenticateApiKey, getAccessibilityStatistics)

// Get issues by session
router.get('/accessibility-issues/session/:urlid', moderateLimiter, authenticateApiKey, getIssuesBySession)

// Get issues by URL
router.get('/accessibility-issues/url', moderateLimiter, authenticateApiKey, getIssuesByUrl)

// Get unapplied issues
router.get('/accessibility-issues/unapplied', moderateLimiter, authenticateApiKey, getUnappliedIssues)

// Get specific issue by ID
router.get('/accessibility-issues/:id', moderateLimiter, authenticateApiKey, getIssueById)

// Update issue status
router.patch('/accessibility-issues/:id', moderateLimiter, authenticateApiKey, updateIssueStatus)

// Delete all issues for a session
router.delete('/accessibility-issues/session/:urlid', moderateLimiter, authenticateApiKey, deleteSessionIssues)

// Delete specific issue
router.delete('/accessibility-issues/:id', moderateLimiter, authenticateApiKey, deleteIssue)

export default router
