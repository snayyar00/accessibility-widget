import { Request, Response } from 'express'

import { parseAndStoreAccessibilityResults } from '../repository/accessibility_issues.repository'

const AUTOMATION_API_BASE = 'https://h80wkk4o40c4cs48cccsg0wk.webability.io'

/**
 * Proxy endpoint for automation scan with caching
 */
export async function startAutomationScan(req: Request, res: Response) {
  try {
    const { url, options } = req.body

    if (!url) {
      return res.status(400).json({ error: 'URL is required' })
    }

    // Start the analysis via external API
    const analyzeResponse = await fetch(`${AUTOMATION_API_BASE}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, options }),
      signal: AbortSignal.timeout(1200000), // 20 minutes
    })

    if (!analyzeResponse.ok) {
      const errorText = await analyzeResponse.text()
      return res.status(analyzeResponse.status).json({
        error: `Analysis request failed: ${analyzeResponse.statusText}`,
        details: errorText,
      })
    }

    const analyzeData = await analyzeResponse.json()
    res.json(analyzeData)
  } catch (error) {
    console.error('Error starting automation scan:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: errorMessage })
  }
}

/**
 * Get automation scan task status with caching
 * ONLY caches completed results, not in-progress polling
 */
export async function getAutomationScanTask(req: Request, res: Response) {
  try {
    const { taskId } = req.params

    if (!taskId) {
      return res.status(400).json({ error: 'Task ID is required' })
    }

    const cacheKey = `automation-scan:${taskId}`

    // First, check if we have a cached COMPLETED result
    const { cacheManager } = await import('../utils/cacheManager')
    const cached = await cacheManager.get(cacheKey)

    if (cached && cached.data?.status === 'completed') {
      console.log(`🎯 Returning cached completed scan: ${taskId}`)
      return res.json(cached.data)
    }

    // Fetch fresh status from external API (don't cache in-progress)
    const taskResponse = await fetch(`${AUTOMATION_API_BASE}/task/${taskId}`, {
      signal: AbortSignal.timeout(30000), // 30 seconds
    })

    if (!taskResponse.ok) {
      throw new Error(`Task status request failed: ${taskResponse.statusText}`)
    }

    const taskData = (await taskResponse.json()) as any

    // ONLY cache if status is 'completed'
    if (taskData.status === 'completed') {
      console.log(`💾 Caching completed scan result: ${taskId}`)
      await cacheManager.set(cacheKey, taskData, {
        memoryTTL: 30 * 60 * 1000, // 30 minutes in memory
        r2TTL: 7 * 24 * 60 * 60 * 1000, // 7 days in R2
        keyPrefix: 'automation-scans',
        enableR2: true,
        enableMemory: true,
      })

      // 🆕 Automatically store accessibility issues in database
      try {
        const url = taskData.url || taskData.data?.url || 'unknown'
        const sessionId = taskId // Use taskId as the session identifier

        const stats = await parseAndStoreAccessibilityResults(
          taskData, // The full automation scan results
          sessionId, // Unique session ID (using taskId)
          url, // URL that was scanned
        )

        console.log(`✅ Stored ${stats.stored_count} accessibility issues for ${url} (session: ${sessionId})`)
        if (stats.stored_count > 0) {
          console.log(`📊 Issue categories:`, stats.categories)
        }
      } catch (dbError) {
        // Don't fail the request if database storage fails
        console.error('⚠️  Failed to store accessibility issues in database:', dbError)
      }
    } else {
      console.log(`⏳ Task in progress, not caching: ${taskId} (status: ${taskData.status})`)
    }

    res.json(taskData)
  } catch (error) {
    console.error('Error getting automation scan task:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: errorMessage })
  }
}
