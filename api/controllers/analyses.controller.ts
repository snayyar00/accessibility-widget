import { Request, Response } from 'express'

import {
  addFixToAnalysis,
  getAnalysesByDomain,
  updateFixAction,
} from '../repository/analyses.repository'
import { getPageHtmlByUrl } from '../repository/pageCache.repository'
import { getSuggestedFixes } from '../services/suggestedFixes/suggestedFixes.service'
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

export async function getPageHtml(req: Request, res: Response) {
  const { url, url_hash: urlHash } = req.query

  try {
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL parameter is required' })
    }

    const html = await getPageHtmlByUrl({
      url: url.trim(),
      urlHash: typeof urlHash === 'string' ? urlHash : null,
    })
    if (html == null) {
      return res.status(404).json({
        error: 'Page HTML not found',
        message: 'No cached HTML found for this URL, or it has expired.',
      })
    }

    res.status(200).json({ html })
  } catch (error) {
    console.error('[DomainAnalyses] Error fetching page HTML:', {
      error: error instanceof Error ? error.message : String(error),
      url: req.query?.url,
    })
    res.status(500).json({
      error: 'Cannot fetch page HTML',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

export async function postSuggestedFixes(req: Request, res: Response) {
  try {
    const { url, html, existingFixes } = req.body as {
      url?: string
      html?: string
      existingFixes?: unknown[]
    }

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'url is required' })
    }
    if (!html || typeof html !== 'string') {
      return res.status(400).json({ error: 'html is required' })
    }
    const fixes = Array.isArray(existingFixes) ? existingFixes : []
    const suggestedFixes = await getSuggestedFixes({
      url: url.trim(),
      html: html.trim(),
      existingFixes: fixes,
    })
    res.status(200).json({ suggestedFixes })
  } catch (error) {
    console.error('[DomainAnalyses] Error fetching suggested fixes:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    res.status(500).json({
      error: 'Cannot fetch suggested fixes',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

export async function postAddFix(req: Request, res: Response) {
  try {
    const { analysisId, fix } = req.body as { analysisId?: string; fix?: Record<string, unknown> }

    if (!analysisId || typeof analysisId !== 'string') {
      return res.status(400).json({ error: 'analysisId is required' })
    }
    if (!fix || typeof fix !== 'object') {
      return res.status(400).json({ error: 'fix object is required' })
    }

    const updated = await addFixToAnalysis(analysisId, fix)
    res.status(200).json(updated)
  } catch (error) {
    console.error('[DomainAnalyses] Error adding fix:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      analysisId: (req.body as { analysisId?: string })?.analysisId,
    })
    res.status(500).json({
      error: 'Cannot add fix',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
