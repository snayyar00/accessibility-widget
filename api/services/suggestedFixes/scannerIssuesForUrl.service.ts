import { getR2KeysByParams } from '../../repository/accessibilityReports.repository'
import { fetchReportFromR2 } from '../../utils/r2Storage'
import { normalizeDomain } from '../../utils/domain.utils'

/** Normalize URL for comparison (trim, lowercase, strip query/fragments, strip trailing slash). Avoids regex on user input to prevent ReDoS. */
function normalizeUrlForMatch(url: string): string {
  if (!url || typeof url !== 'string') return ''
  const trimmed = url.trim().toLowerCase()
  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)
    let path = parsed.pathname
    while (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1)
    return `${parsed.origin}${path}`.toLowerCase()
  } catch {
    let s = trimmed
    while (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1)
    return s
  }
}

/** One scanner issue (axe or htmlcs) with optional pages_affected. */
export interface ScannerIssueForUrl {
  source: 'axe' | 'htmlcs'
  severity: 'error' | 'warning' | 'notice'
  message?: string
  code?: string
  context?: string | string[]
  selectors?: string | string[]
  description?: string
  recommended_action?: string
  help?: string
  impact?: string
  wcag_code?: string
  pages_affected?: string[]
}

/**
 * Fetch the latest accessibility report for the given domain from R2,
 * then return all scanner issues (axe + htmlcs) where Affected Pages includes the page URL.
 * Used so suggested-fixes can send both HTML and scanner report issues to GPT.
 */
export async function getScannerIssuesForPageUrl(
  pageUrl: string,
  domain?: string
): Promise<ScannerIssueForUrl[]> {
  if (!pageUrl || typeof pageUrl !== 'string' || pageUrl.trim().length === 0) {
    return []
  }

  const normalizedPageUrl = normalizeUrlForMatch(pageUrl)
  const domainToUse = (domain && domain.trim()) || normalizeDomain(pageUrl)
  if (!domainToUse) {
    return []
  }

  try {
    // Try domain variants: reports may be stored as "academicoach.com" or "www.academicoach.com"
    const domainVariants = [domainToUse]
    if (domainToUse.startsWith('www.')) {
      domainVariants.push(domainToUse.slice(4))
    } else {
      domainVariants.push(`www.${domainToUse}`)
    }

    let rows: Awaited<ReturnType<typeof getR2KeysByParams>> = []
    for (const variant of domainVariants) {
      rows = await getR2KeysByParams({ url: variant })
      if (rows && rows.length > 0) break
    }

    if (!rows || rows.length === 0) return []

    const latest = rows[0]
    const r2Key = latest?.r2_key
    if (!r2Key || typeof r2Key !== 'string') {
      return []
    }

    const report = await fetchReportFromR2(r2Key)
    if (!report || typeof report !== 'object') {
      // Report fetch failed or empty — suggested fixes will use HTML only
      return []
    }

    const issues: ScannerIssueForUrl[] = []

    function includesPageUrl(pagesAffected: string[] | undefined): boolean {
      if (!Array.isArray(pagesAffected) || pagesAffected.length === 0) return false
      return pagesAffected.some(
        (p) => typeof p === 'string' && normalizeUrlForMatch(p) === normalizedPageUrl
      )
    }

    function collect(
      source: 'axe' | 'htmlcs',
      severity: 'error' | 'warning' | 'notice',
      list: any[] | undefined
    ) {
      if (!Array.isArray(list)) return
      list.forEach((issue) => {
        if (!issue || !includesPageUrl(issue.pages_affected)) return
        issues.push({
          source,
          severity,
          message: issue.message,
          code: issue.code,
          context: issue.context,
          selectors: issue.selectors,
          description: issue.description,
          recommended_action: issue.recommended_action,
          help: issue.help,
          impact: issue.impact,
          wcag_code: issue.wcag_code,
          pages_affected: issue.pages_affected,
        })
      })
    }

    if (report.axe) {
      collect('axe', 'error', report.axe.errors)
      collect('axe', 'warning', report.axe.warnings)
      collect('axe', 'notice', report.axe.notices)
    }
    if (report.htmlcs) {
      collect('htmlcs', 'error', report.htmlcs.errors)
      collect('htmlcs', 'warning', report.htmlcs.warnings)
      collect('htmlcs', 'notice', report.htmlcs.notices)
    }

    return issues
  } catch (err) {
    console.error('[ScannerIssuesForUrl] Error fetching scanner issues for page:', {
      pageUrl,
      domain: domainToUse,
      error: err instanceof Error ? err.message : String(err),
    })
    return []
  }
}
