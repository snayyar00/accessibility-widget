import { Router } from 'express'
import { startAutomationScan, getAutomationScanTask } from '../controllers/automation-scan.controller'

const router = Router()

// Start automation scan (proxy to external API)
router.post('/automation-scan/analyze', startAutomationScan)

// Get task status with caching
router.get('/automation-scan/task/:taskId', getAutomationScanTask)

export default router

