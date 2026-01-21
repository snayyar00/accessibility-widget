import { Router } from 'express'

import { handleScraperAnalysis } from '../controllers/scraper.controller'
import {
  getDeletedFixesHandler,
  updateDeletedFixesHandler,
  deleteAutoFixesHandler,
} from '../controllers/autoFixes.controller'
import { isAuthenticated } from '../middlewares/auth.middleware'
import { moderateLimiter } from '../middlewares/limiters.middleware'

const router = Router()

// Scraper analysis endpoint - fetches from scraper API and filters deleted fixes
// Public endpoint (no authentication required) - similar to addImpressionsURL
router.post(
  '/analyze',
  moderateLimiter,
  handleScraperAnalysis,
)

// Get deleted fixes endpoint - only fetches deleted fixes from database
router.get(
  '/deleted-fixes',
  moderateLimiter,
  isAuthenticated,
  getDeletedFixesHandler,
)

// Update deleted fixes endpoint
router.put(
  '/deleted-fixes',
  moderateLimiter,
  isAuthenticated,
  updateDeletedFixesHandler,
)

// Delete auto fixes record endpoint
router.delete(
  '/deleted-fixes',
  moderateLimiter,
  isAuthenticated,
  deleteAutoFixesHandler,
)

export default router
