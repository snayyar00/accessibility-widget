import { Request, Response } from 'express'

import {
  getAnalysesByDomain,
  updateFixAction,
} from '../repository/analyses.repository'
import { normalizeDomain } from '../utils/domain.utils'

export async function getDomainAnalyses(req: Request, res: Response) {
  const { url } = req.query

  try {
    if (!url || typeof url !== 'string') {
      return res.status(400).send('URL parameter is required')
    }

    const domain = normalizeDomain(url)
    console.log('[DomainAnalyses] Fetching analyses for domain:', domain)
    const analyses = await getAnalysesByDomain(domain)

    res.status(200).json(analyses)
  } catch (error) {
    console.error('[DomainAnalyses] Error fetching domain analyses:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      url: url,
      errorType: error?.constructor?.name,
    })
    res.status(500).json({
      error: 'Cannot fetch analyses',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

export async function updateAnalysisFixAction(req: Request, res: Response) {
  const { analysisId, fixIndex, action } = req.body

  try {
    if (!analysisId || typeof analysisId !== 'string') {
      return res.status(400).json({ error: 'analysisId is required' })
    }

    if (typeof fixIndex !== 'number' || fixIndex < 0) {
      return res.status(400).json({ error: 'fixIndex must be a valid number' })
    }

    if (action !== 'update' && action !== 'deleted') {
      return res.status(400).json({ error: "action must be 'update' or 'deleted'" })
    }

    console.log('[DomainAnalyses] Updating fix action:', { analysisId, fixIndex, action })
    const updatedAnalysis = await updateFixAction(analysisId, fixIndex, action)

    res.status(200).json(updatedAnalysis)
  } catch (error) {
    console.error('[DomainAnalyses] Error updating fix action:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      analysisId,
      fixIndex,
      action,
    })
    res.status(500).json({
      error: 'Cannot update fix action',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
