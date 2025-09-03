import { Request, Response } from 'express'
// Using simplified service for testing
import { processMonitoringBatch, MonitoringBatch } from '../services/monitoring/monitoring-simple.service'
import logger from '../utils/logger'

/**
 * Handle monitoring notification from external service
 */
export async function handleMonitoringNotification(req: Request, res: Response) {
  try {
    // Validate API key
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']
    
    if (!apiKey || apiKey !== process.env.MONITOR_API_KEY) {
      logger.warn('Unauthorized monitoring notification attempt')
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid or missing API key' 
      })
    }

    // Validate request body
    const batch: MonitoringBatch = req.body
    
    if (!batch || !batch.results || !Array.isArray(batch.results)) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Missing or invalid results array' 
      })
    }

    if (batch.results.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Results array cannot be empty' 
      })
    }

    if (batch.results.length > 100) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Results array cannot exceed 100 items' 
      })
    }

    // Validate each result
    for (const result of batch.results) {
      if (!result.site_id || typeof result.site_id !== 'number') {
        return res.status(400).json({ 
          error: 'Invalid request',
          message: 'Each result must have a valid site_id' 
        })
      }

      if (!result.url || typeof result.url !== 'string') {
        return res.status(400).json({ 
          error: 'Invalid request',
          message: 'Each result must have a valid url' 
        })
      }

      if (typeof result.is_down !== 'boolean') {
        return res.status(400).json({ 
          error: 'Invalid request',
          message: 'Each result must have is_down as boolean' 
        })
      }

      if (!result.checked_at) {
        return res.status(400).json({ 
          error: 'Invalid request',
          message: 'Each result must have checked_at timestamp' 
        })
      }
    }

    logger.info(`Received monitoring batch ${batch.batch_id} with ${batch.results.length} results`)

    // Process the batch asynchronously
    processMonitoringBatch(batch).catch(error => {
      logger.error('Error processing monitoring batch:', error)
    })

    // Return success immediately
    return res.json({ 
      success: true,
      message: 'Monitoring data received',
      processed: batch.results.length,
      batch_id: batch.batch_id
    })

  } catch (error) {
    logger.error('Error handling monitoring notification:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to process monitoring notification' 
    })
  }
}