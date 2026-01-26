import { tursoClient } from '../config/turso.config'
import { normalizeDomain } from '../utils/domain.utils'

export interface Analysis {
  id: string
  url_hash: string
  url: string | null
  domain: string | null
  allowed_site_id: number | null
  score: number | null
  issues_count: number
  result_json: string
  r2_key: string | null
  version: number
  previous_score: number | null
  score_change: number | null
  analyzed_at: number
  synced_to_mysql: number
}

export async function getAnalysesByDomain(domain: string): Promise<Analysis[]> {
  const normalizedDomain = normalizeDomain(domain)
  
  try {
    console.log('[AnalysesRepository] Querying Turso for domain:', normalizedDomain)
    const result = await tursoClient.execute({
      sql: `
        SELECT 
          id,
          url_hash,
          url,
          domain,
          allowed_site_id,
          score,
          issues_count,
          result_json,
          r2_key,
          version,
          previous_score,
          score_change,
          analyzed_at,
          synced_to_mysql
        FROM analyses
        WHERE domain = ?
        ORDER BY analyzed_at DESC
      `,
      args: [normalizedDomain],
    })

    console.log('[AnalysesRepository] Found', result.rows.length, 'analyses')
    return result.rows.map((row) => ({
      id: row.id as string,
      url_hash: row.url_hash as string,
      url: row.url as string | null,
      domain: row.domain as string | null,
      allowed_site_id: row.allowed_site_id as number | null,
      score: row.score as number | null,
      issues_count: row.issues_count as number,
      result_json: row.result_json as string,
      r2_key: row.r2_key as string | null,
      version: row.version as number,
      previous_score: row.previous_score as number | null,
      score_change: row.score_change as number | null,
      analyzed_at: row.analyzed_at as number,
      synced_to_mysql: row.synced_to_mysql as number,
    }))
  } catch (error) {
    console.error('[AnalysesRepository] Error executing query:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      domain: normalizedDomain,
    })
    throw error
  }
}

export async function updateFixAction(
  analysisId: string,
  fixIndex: number,
  action: 'update' | 'deleted',
): Promise<Analysis> {
  const startTime = Date.now()
  try {
    console.log('[AnalysesRepository] Updating fix action:', { analysisId, fixIndex, action })

    // Get the current analysis and update in one transaction-like operation
    const getResult = await tursoClient.execute({
      sql: 'SELECT result_json FROM analyses WHERE id = ?',
      args: [analysisId],
    })

    if (getResult.rows.length === 0) {
      throw new Error('Analysis not found')
    }

    const currentJson = getResult.rows[0].result_json as string
    const parsedData = JSON.parse(currentJson)

    // Validate and update the specific fix's action
    if (
      parsedData.analysis &&
      parsedData.analysis.fixes &&
      Array.isArray(parsedData.analysis.fixes) &&
      parsedData.analysis.fixes[fixIndex]
    ) {
      parsedData.analysis.fixes[fixIndex].action = action

      // Update the JSON in the database
      const updatedJson = JSON.stringify(parsedData)
      await tursoClient.execute({
        sql: 'UPDATE analyses SET result_json = ? WHERE id = ?',
        args: [updatedJson, analysisId],
      })

      // Return the updated analysis data directly without another query
      const row = getResult.rows[0]
      const updatedAnalysis: Analysis = {
        id: analysisId,
        url_hash: parsedData.url_hash || '',
        url: parsedData.url || null,
        domain: parsedData.domain || null,
        allowed_site_id: null, // Not in JSON, would need separate query
        score: parsedData.score || null,
        issues_count: parsedData.analysis?.fixes?.length || 0,
        result_json: updatedJson,
        r2_key: parsedData.r2_key || null,
        version: parsedData.version || 1,
        previous_score: parsedData.previous_score || null,
        score_change: parsedData.score_change || null,
        analyzed_at: parsedData.analyzed_at || Math.floor(Date.now() / 1000),
        synced_to_mysql: parsedData.synced_to_mysql || 0,
      }

      // Get full record to ensure we have all fields
      const fullResult = await tursoClient.execute({
        sql: `
          SELECT 
            id,
            url_hash,
            url,
            domain,
            allowed_site_id,
            score,
            issues_count,
            result_json,
            r2_key,
            version,
            previous_score,
            score_change,
            analyzed_at,
            synced_to_mysql
          FROM analyses
          WHERE id = ?
        `,
        args: [analysisId],
      })

      const fullRow = fullResult.rows[0]
      const finalAnalysis: Analysis = {
        id: fullRow.id as string,
        url_hash: fullRow.url_hash as string,
        url: fullRow.url as string | null,
        domain: fullRow.domain as string | null,
        allowed_site_id: fullRow.allowed_site_id as number | null,
        score: fullRow.score as number | null,
        issues_count: fullRow.issues_count as number,
        result_json: fullRow.result_json as string,
        r2_key: fullRow.r2_key as string | null,
        version: fullRow.version as number,
        previous_score: fullRow.previous_score as number | null,
        score_change: fullRow.score_change as number | null,
        analyzed_at: fullRow.analyzed_at as number,
        synced_to_mysql: fullRow.synced_to_mysql as number,
      }

      const duration = Date.now() - startTime
      console.log(`[AnalysesRepository] Fix action updated successfully in ${duration}ms`)
      return finalAnalysis
    } else {
      throw new Error('Invalid fix index or analysis structure')
    }
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('[AnalysesRepository] Error updating fix action:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      analysisId,
      fixIndex,
      duration: `${duration}ms`,
    })
    throw error
  }
}

export type AddFixInput = {
  selector?: string
  issue_type?: string
  wcag_criteria?: string
  wcag?: string
  action?: 'update' | 'add'
  attributes?: Record<string, unknown>
  impact?: string
  description?: string
  current_value?: string
  confidence?: number
  suggested_fix?: string
  category?: string
}

const BY_CATEGORY_KEYS = [
  'animations', 'buttons', 'aria', 'duplicate_ids', 'focus', 'headings',
  'tables', 'forms', 'links', 'icons', 'images', 'keyboard', 'media',
] as const

/**
 * Appends a new fix to result_json.analysis.fixes and updates the DB.
 * The fix is stored with action 'update' by default.
 */
export async function addFixToAnalysis(analysisId: string, fix: AddFixInput): Promise<Analysis> {
  const startTime = Date.now()
  try {
    console.log('[AnalysesRepository] Adding fix to analysis:', { analysisId })

    const getResult = await tursoClient.execute({
      sql: 'SELECT result_json FROM analyses WHERE id = ?',
      args: [analysisId],
    })

    if (getResult.rows.length === 0) {
      throw new Error('Analysis not found')
    }

    const currentJson = getResult.rows[0].result_json as string
    const parsedData = JSON.parse(currentJson)

    if (!parsedData.analysis || !Array.isArray(parsedData.analysis.fixes)) {
      throw new Error('Invalid analysis structure: missing analysis.fixes')
    }

    const newFix = {
      ...fix,
      action: fix.action ?? 'update',
    }
    parsedData.analysis.fixes.push(newFix)

    let summary = parsedData.analysis.summary
    if (!summary || typeof summary !== 'object') {
      summary = { total_fixes: parsedData.analysis.fixes.length, by_category: {} }
      parsedData.analysis.summary = summary
    } else {
      if (summary.total_fixes != null) {
        summary.total_fixes = parsedData.analysis.fixes.length
      }
    }
    const rawCategory = String(fix.category ?? 'aria').trim() || 'aria'
    const category = (BY_CATEGORY_KEYS as readonly string[]).includes(rawCategory) ? rawCategory : 'aria'
    let byCategory = summary.by_category
    if (!byCategory || typeof byCategory !== 'object') {
      byCategory = {}
      summary.by_category = byCategory
    }
    const entry = (byCategory as Record<string, { status?: string; issues?: number }>)[category]
    if (entry && typeof entry === 'object') {
      entry.issues = (typeof entry.issues === 'number' ? entry.issues : 0) + 1
    } else {
      ;(byCategory as Record<string, { status: string; issues: number }>)[category] = {
        status: 'success',
        issues: 1,
      }
    }

    const updatedJson = JSON.stringify(parsedData)
    await tursoClient.execute({
      sql: 'UPDATE analyses SET result_json = ? WHERE id = ?',
      args: [updatedJson, analysisId],
    })

    const fullResult = await tursoClient.execute({
      sql: `
        SELECT id, url_hash, url, domain, allowed_site_id, score, issues_count,
               result_json, r2_key, version, previous_score, score_change, analyzed_at, synced_to_mysql
        FROM analyses WHERE id = ?
      `,
      args: [analysisId],
    })
    const fullRow = fullResult.rows[0]
    const finalAnalysis: Analysis = {
      id: fullRow.id as string,
      url_hash: fullRow.url_hash as string,
      url: fullRow.url as string | null,
      domain: fullRow.domain as string | null,
      allowed_site_id: fullRow.allowed_site_id as number | null,
      score: fullRow.score as number | null,
      issues_count: fullRow.issues_count as number,
      result_json: fullRow.result_json as string,
      r2_key: fullRow.r2_key as string | null,
      version: fullRow.version as number,
      previous_score: fullRow.previous_score as number | null,
      score_change: fullRow.score_change as number | null,
      analyzed_at: fullRow.analyzed_at as number,
      synced_to_mysql: fullRow.synced_to_mysql as number,
    }

    const duration = Date.now() - startTime
    console.log(`[AnalysesRepository] Fix added successfully in ${duration}ms`)
    return finalAnalysis
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('[AnalysesRepository] Error adding fix:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      analysisId,
      duration: `${duration}ms`,
    })
    throw error
  }
}
