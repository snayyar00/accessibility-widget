import OpenAI from 'openai'

import { getScannerIssuesForPageUrl } from './scannerIssuesForUrl.service'

if (!process.env.OPENROUTER_API_KEY) {
  throw new Error('OPENROUTER_API_KEY environment variable is required')
}

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': 'Webability.io',
    'X-Title': 'Webability.io - Suggested Accessibility Fixes',
  },
})

export interface AutoFixItem {
  selector?: string
  issue_type?: string
  wcag_criteria?: string
  wcag?: string
  action?: 'update' | 'add' | 'remove' | 'create'
  attributes?: Record<string, unknown>
  impact?: string
  description?: string
  current_value?: string
  confidence?: number
  suggested_fix?: string
  category?: string
}

const SUGGESTED_FIXES_FUNCTION_SCHEMA = {
  type: 'function' as const,
  function: {
    name: 'suggest_accessibility_fixes',
    description: 'Return fixes for selectors NOT in existing list. Each fix: selector, issue_type, wcag_criteria, action, attributes, impact, description, current_value, confidence, wcag, suggested_fix, category.',
    parameters: {
      type: 'object',
      properties: {
        suggested_fixes: {
          type: 'array',
          description: 'Fix objects with required fields.',
          items: {
            type: 'object',
            properties: {
              selector: { type: 'string' },
              issue_type: { type: 'string' },
              wcag_criteria: { type: 'string' },
              action: { type: 'string', enum: ['update', 'add', 'remove', 'create'] },
              attributes: { type: 'object', additionalProperties: true, description: 'Non-empty. e.g. {"alt":"..."}, {"role":null}' },
              impact: { type: 'string', enum: ['minor', 'moderate', 'serious', 'critical'] },
              description: { type: 'string' },
              current_value: { type: ['string', 'null'] },
              confidence: { type: 'number' },
              wcag: { type: 'string' },
              suggested_fix: { type: 'string' },
              category: { type: 'string', enum: ['animations', 'buttons', 'aria', 'duplicate_ids', 'focus', 'headings', 'tables', 'forms', 'links', 'icons', 'images', 'keyboard', 'media'] },
            },
            required: ['selector', 'issue_type', 'wcag_criteria', 'action', 'attributes', 'impact', 'description', 'current_value', 'confidence', 'wcag', 'suggested_fix', 'category'],
          },
        },
      },
      required: ['suggested_fixes'],
    },
  },
}

/** Build compact summary of existing fixes (count + selectors + sample of issue_types) instead of full JSON. */
function buildExistingFixesSummary(existingFixes: AutoFixItem[]): string {
  const selectors = existingFixes
    .map((f) => f.selector)
    .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    .map((s) => s.trim())

  const issueTypes = [...new Set(existingFixes.map((f) => f.issue_type).filter(Boolean) as string[])].slice(0, 8)

  if (selectors.length === 0) {
    return 'No existing fixes. You can suggest fixes for any element.'
  }

  const selectorList = selectors.map((s) => `  - "${s}"`).join('\n')
  const issueTypesLine =
    issueTypes.length > 0 ? `\nIssue types already addressed (sample): ${issueTypes.join(', ')}.` : ''
  const result = `EXISTING FIXES SUMMARY (DO NOT suggest fixes for these selectors):
Total: ${existingFixes.length} existing fix(es).
Selectors:
${selectorList}${issueTypesLine}`
  return result
}

/** Shrink HTML for accessibility analysis: remove scripts/styles, extract body, collapse whitespace, truncate long content. */
function shrinkHtmlForAccessibility(html: string): string {
  let s = html

  // Remove script, style, noscript blocks
  s = s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
  s = s.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
  s = s.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, '')

  // Extract body content if present (keeps structure, drops head)
  const bodyMatch = s.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)
  if (bodyMatch) {
    s = bodyMatch[1]
  }

  // Remove all SVG elements (reduces token count; scanner issues still surface SVG a11y problems)
  s = s.replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, '')
  s = s.replace(/<svg\b[^>]*\/>/gi, '')

  // Remove HTML comments
  s = s.replace(/<!--[\s\S]*?-->/g, '')

  // Collapse repeated whitespace (spaces, newlines, tabs) to single space
  s = s.replace(/\s+/g, ' ').trim()

  const maxLen = 30_000
  if (s.length > maxLen) {
    s = s.slice(0, maxLen) + '\n...[truncated]'
  }
  return s
}

/** Scanner issue for this page (Affected Pages includes the URL). Passed to GPT with HTML. */
export interface ScannerReportIssueInput {
  source?: 'axe' | 'htmlcs'
  severity?: 'error' | 'warning' | 'notice'
  message?: string
  code?: string
  context?: string | string[]
  selectors?: string | string[]
  description?: string
  recommended_action?: string
  help?: string
  impact?: string
  wcag_code?: string
}

export interface GetSuggestedFixesInput {
  url: string
  html: string
  existingFixes: AutoFixItem[]
  /** Domain for scanner report lookup. When provided, scanner issues are fetched in parallel with prompt building. */
  domain?: string
  /** Pre-fetched scanner issues (used when domain not provided). */
  scannerReportIssues?: ScannerReportIssueInput[]
}

/**
 * Comprehensive post-processing filter. Rejects fixes that violate accessibility best practices
 * or our prompt rules. Every prompt rule MUST have a corresponding filter (models ignore rules).
 */
function applyAllFilters(f: AutoFixItem): boolean {
  const attrs = f.attributes
  if (!attrs || typeof attrs !== 'object' || Array.isArray(attrs) || Object.keys(attrs).length === 0) {
    return false
  }
  const attrsObj = attrs as Record<string, unknown>
  const sel = (f.selector ?? '').toLowerCase()
  const issueType = String(f.issue_type ?? '').toLowerCase()
  const altVal = attrsObj.alt

  // --- FORBIDDEN: Inline styles / contrast fixes (require design analysis) ---
  if (attrsObj.style != null || (typeof attrsObj.color === 'string' && attrsObj.color)) return false

  // --- HEADINGS: Never add role="heading" or aria-level to h1-h6 ---
  const targetsHeading = /\bh[1-6]\b/.test(sel)
  if (targetsHeading && (attrsObj.role === 'heading' || attrsObj['aria-level'] != null)) return false

  // --- HEADINGS: role="heading" on div/span/p requires aria-level; incomplete fix is invalid ---
  const targetsNonHeading = /\b(div|span|p)\b/.test(sel)
  if (
    targetsNonHeading &&
    attrsObj.role === 'heading' &&
    (attrsObj['aria-level'] == null || attrsObj['aria-level'] === '')
  )
    return false

  // --- SEMANTIC ELEMENTS: Don't add redundant aria-label (footer, main, header already announce) ---
  const ariaLabelVal = attrsObj['aria-label']
  if (typeof ariaLabelVal === 'string') {
    const label = ariaLabelVal.trim().toLowerCase()
    const redundantForElement = (elem: string, ...redundant: string[]) =>
      sel.includes(elem) && redundant.some((r) => label === r || label.replace(/\s+/g, ' ') === r)
    const redundantLabels = ['header', 'main content area', 'main', 'footer', 'banner']
    if (
      redundantForElement('footer', 'footer', 'contentinfo') ||
      redundantForElement('main', 'main', 'main content', 'main content area') ||
      redundantForElement('header', 'header', 'banner') ||
      redundantForElement('nav', 'navigation', 'nav') ||
      (sel.includes('div') && redundantLabels.some((r) => label === r || label.replace(/\s+/g, ' ') === r))
    )
      return false
  }

  // --- NAVIGATION: Don't add role="dialog" or aria-modal to nav overlay - it's a panel, not a modal ---
  if (
    attrsObj.role === 'dialog' &&
    (sel.includes('wp-block-navigation__responsive') || sel.includes('navigation'))
  )
    return false
  if (
    attrsObj['aria-modal'] === true ||
    attrsObj['aria-modal'] === 'true'
  ) {
    if (sel.includes('wp-block-navigation__responsive')) return false
  }

  // --- NAVIGATION: Don't add role="menu"/"menuitem" to link-based nav - use list semantics ---
  if (
    (attrsObj.role === 'menu' || attrsObj.role === 'menuitem') &&
    sel.includes('wp-block-navigation')
  )
    return false

  // --- REDUNDANT ROLES: role="link" on <a>, role="form" on <form>, role="button" on <button>, role="navigation" on nav ---
  if ((sel.includes('a[') || sel.startsWith('a.')) && attrsObj.role === 'link') return false
  if (sel.includes('form') && attrsObj.role === 'form') return false
  if (sel.includes('button') && attrsObj.role === 'button') return false
  if (sel.includes('nav') && attrsObj.role === 'navigation') return false

  // --- ROLE: Don't remove role="group" or role="region" from div - they add valid semantics ---
  const isRemovingRole =
    attrsObj.role === '' || attrsObj.role === null || attrsObj.role === undefined
  const currentRole = String(f.current_value ?? '').toLowerCase()
  if (isRemovingRole && sel.includes('div') && /^(group|region)$/.test(currentRole)) return false

  // --- ROLE="region": Requires aria-label; unnamed regions clutter screen reader navigation ---
  if (
    attrsObj.role === 'region' &&
    (attrsObj['aria-label'] == null || String(attrsObj['aria-label']).trim() === '')
  )
    return false

  // --- ROLE="text": Wrong for p, div, span ---
  if (attrsObj.role === 'text') return false

  // --- IMAGES: alt only on img/area/input[type=image] ---
  if (attrsObj.alt != null) {
    const targetsImgOrArea = /\bimg\b|\barea\b|\[type=['"]?image['"]?\]/.test(sel)
    if (!targetsImgOrArea) return false
    if (sel.includes('figure')) return false
    if (sel.includes("img") && (sel.includes("alt=''") || sel.includes('alt=""'))) return false
    if (typeof altVal === 'string' && /descriptive\s+text\s+for\s+(the\s+)?image/i.test(altVal))
      return false
  }

  // --- IMAGES: missing_alt_text when alt already exists ---
  if (attrsObj.alt != null && /missing_alt|alt_text|non_descriptive_alt/i.test(issueType)) {
    // img[alt], img[alt='...'], img[alt="..."] = alt attribute exists (img[alt] doesn't specify value)
    const hasAltInSelector =
      /img\[alt\]/.test(sel) ||
      (/img\[alt=['"]/.test(sel) && !/img\[alt=''\]|img\[alt=""\]/.test(sel))
    const missingAltButHasValue =
      /missing_alt/i.test(issueType) &&
      typeof f.current_value === 'string' &&
      f.current_value.trim().length > 2
    if (hasAltInSelector || missingAltButHasValue) return false
  }

  // --- IMAGES: same-value alt update (no real change) ---
  if (typeof altVal === 'string' && typeof f.current_value === 'string') {
    const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ').replace(/["']/g, '')
    if (norm(altVal) === norm(f.current_value)) return false
  }

  // --- LINKS: Never add target="_blank" (changes behavior) ---
  if (attrsObj.target === '_blank') return false

  // --- LINKS/BUTTONS: Never add aria-label when element has visible text (current_value) ---
  const hasAriaLabel = attrsObj['aria-label'] != null
  const hasVisibleText = typeof f.current_value === 'string' && f.current_value.trim().length > 1
  const isLink = sel.includes('a[') || sel.startsWith('a.') || /^a\b/.test(sel)
  const isButton = sel.includes('button')
  if (hasAriaLabel && hasVisibleText && (isLink || isButton)) return false

  // --- LINKS: Nav links (mailto, home, about, contact, news, footer) almost always have visible text ---
  // Model often wrongly reports current_value="" for these; adding aria-label is usually redundant
  if (hasAriaLabel && isLink && !hasVisibleText) {
    const hrefMatch = sel.match(/href\s*=\s*['"]([^'"]+)['"]/i)
    const href = (hrefMatch?.[1] ?? '').toLowerCase()
    const isLikelyNavLink =
      href.startsWith('mailto:') ||
      /^https?:\/\/[^/]*\/?$/.test(href) || // home
      /\/(chi-siamo|contatti|contact|news|about|about-us|chi_siamo)\b/i.test(href) ||
      /\/(privacy-policy|cookie-policy|terms|terms-of-use|dichiarazione|impressum|legal)\b/i.test(href)
    const isFooterLink = sel.includes('footer') && sel.includes('a')
    if (isLikelyNavLink || isFooterLink) return false
  }

  // --- LISTS: Don't add aria-label to ul inside nav - parent nav already has aria-label ---
  if (
    hasAriaLabel &&
    sel.includes('ul') &&
    (sel.includes('wp-block-navigation') || sel.includes('nav'))
  )
    return false

  // --- BUTTONS/NAV: Never remove or change aria-label (they need it) ---
  if (hasAriaLabel && (isButton || sel.includes('nav'))) {
    const ariaLabelVal = attrsObj['aria-label']
    const isRemoving = ariaLabelVal === '' || ariaLabelVal === null || ariaLabelVal === undefined
    const isGenericPlaceholder =
      typeof ariaLabelVal === 'string' && /accessible\s+name|generic|placeholder/i.test(ariaLabelVal)
    const isRedundantOnNav =
      sel.includes('nav') && /redundant_aria_label|redundant.*label/i.test(issueType)
    if (isRemoving || isGenericPlaceholder || isRedundantOnNav) return false
  }

  // --- IFRAME/IMG: Don't add aria-label when title exists (title provides name) ---
  if (
    hasAriaLabel &&
    (sel.includes('iframe') || sel.includes('img')) &&
    sel.includes('title=')
  ) {
    return false
  }

  // --- ARIA-HASPOPUP: Never on close buttons; never remove from menu buttons ---
  if (attrsObj['aria-haspopup'] != null && /close|dismiss|chiudi/i.test(sel)) return false
  if (
    Object.keys(attrsObj).some((k) => k.toLowerCase() === 'aria-haspopup') &&
    isButton &&
    (attrsObj['aria-haspopup'] === '' ||
      attrsObj['aria-haspopup'] === null ||
      attrsObj['aria-haspopup'] === undefined)
  )
    return false

  // --- ARIA-CONTROLS: Never on close buttons; never placeholder IDs ---
  if (attrsObj['aria-controls'] != null && /close|dismiss|chiudi/i.test(sel)) return false
  const ariaControlsVal = attrsObj['aria-controls']
  if (typeof ariaControlsVal === 'string' && /^submenu-id$/i.test(ariaControlsVal.trim()))
    return false

  // --- ARIA-DESCRIBEDBY / ARIA-LABELLEDBY: Reject placeholder IDs ---
  const ariaDescribedBy = attrsObj['aria-describedby']
  const ariaLabelledBy = attrsObj['aria-labelledby']
  const placeholderId = (v: unknown) =>
    typeof v === 'string' && /^(element-id|target-id|label-id|placeholder)$/i.test(v.trim())
  if (placeholderId(ariaDescribedBy) || placeholderId(ariaLabelledBy)) return false

  return true
}

/**
 * Call GPT to suggest additional accessibility fixes for the given HTML.
 * Excludes fixes that duplicate any already in existingFixes.
 * Returns fix objects in the same format as result_json.analysis.fixes.
 */
export async function getSuggestedFixes(input: GetSuggestedFixesInput): Promise<AutoFixItem[]> {
  const totalStart = Date.now()
  const { url, html, existingFixes, domain, scannerReportIssues: scannerReportIssuesInput } = input

  // Input validation
  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    throw new Error('url is required and must be a non-empty string')
  }
  if (!html || typeof html !== 'string' || html.trim().length === 0) {
    throw new Error('html is required and must be a non-empty string')
  }
  if (!Array.isArray(existingFixes)) {
    throw new Error('existingFixes must be an array')
  }

  // Start scanner fetch in parallel with prompt building (skips R2 when domain has no report)
  const scannerPromise =
    domain?.trim() && scannerReportIssuesInput === undefined
      ? getScannerIssuesForPageUrl(url.trim(), domain.trim())
      : Promise.resolve(scannerReportIssuesInput ?? [])

  const existingFixesSummary = buildExistingFixesSummary(existingFixes)
  const htmlSnippet = shrinkHtmlForAccessibility(html)

  const scannerReportIssues = await scannerPromise

  const exactFormatExample = `{
  "selector": "footer.text-gray-300",
  "issue_type": "redundant_aria_role",
  "wcag_criteria": "4.1.2",
  "action": "remove",
  "attributes": { "role": "" },
  "impact": "minor",
  "description": "Redundant role='contentinfo' on <footer> (implicit role)",
  "current_value": "contentinfo",
  "confidence": 0.95,
  "wcag": "4.1.2",
  "suggested_fix": "Remove redundant role from <footer>",
  "category": "aria"
}`

  const hasScannerIssues = Array.isArray(scannerReportIssues) && scannerReportIssues.length > 0

  const systemPrompt = `You are an accessibility expert. Find ADDITIONAL issues and suggest fixes ONLY for elements NOT in the EXISTING SELECTORS list. Use the HTML${hasScannerIssues ? ' and scanner issues' : ''} to identify issues. Return at most 10 fixes.

REQUIRED FORMAT (each fix): selector, issue_type, wcag_criteria, action, attributes, impact, description, current_value, confidence, wcag, suggested_fix, category

Example:
${exactFormatExample}

RULES (ALL enforced by post-processing; violations are rejected):
- NEVER suggest fixes for selectors already in the existing list. Match selectors exactly.
- UNIQUE FIXES: Each fix must have a unique combination of selector AND attributes.
- HEADINGS: Do NOT add role="heading" or aria-level to h1-h6; they have implicit role. Only REMOVE redundant role.
- REDUNDANT ROLES: Do NOT add role="link" to <a>, role="form" to <form>, role="button" to <button>, role="navigation" to <nav>; do NOT remove role="group" or role="region" from div.
- ROLE: Do NOT add role="text" to p, div, span; do NOT add role="region" without aria-label.
- ARIA-REF: Do NOT suggest aria-describedby or aria-labelledby with placeholder IDs; target ID must exist in HTML.
- STYLE: Do NOT suggest inline style or color for contrast - requires design analysis.
- IFRAME/IMG: Do NOT add aria-label to iframe/img that has title attribute.
- NAV: Do NOT remove or change aria-label on nav; never use placeholder like "Accessible name".
- BUTTONS: Do NOT remove aria-label from buttons; do NOT add aria-label to buttons with visible text; do NOT remove aria-haspopup (fix wrong value e.g. "dialog"→"menu"); do NOT add aria-haspopup/aria-controls to close/dismiss buttons.
- LINKS: Do NOT add aria-label to links with visible text; do NOT add target="_blank"; nav links (mailto, home, about, contact) usually have text - verify before adding aria-label.
- IMAGES: Do NOT add alt to img[alt='']; do NOT suggest missing_alt_text when alt exists; alt only on img/area/input[type=image]; no placeholder alt like "Descriptive text for the image".
- SEMANTIC: Do NOT add role="heading" to div/span/p without aria-level (incomplete); do NOT add redundant aria-label to footer/main/header/nav or div (e.g. "Header", "Main content area").
- NAVIGATION: Do NOT add role="dialog" or aria-modal to nav overlay (it's a panel, not a modal); do NOT add role="menu"/"menuitem" to link-based nav (use list semantics).
- action: Use the correct action for each fix:
  - "remove": Remove an attribute (redundant role, redundant aria). Use attributes: {"role":""} or {"role":null}.
  - "update": Change/modify an existing attribute value (e.g. set alt, aria-label, aria-expanded, autocomplete).
  - "add": Add attribute or content to existing element (e.g. aria-haspopup, aria-controls, prepend skip link).
  - "create": Create new element (e.g. skip link). Use attributes: {"prepend":"<a href=\\"#main-content\\" class=\\"skip-link\\">Skip to main content</a>"}.
- attributes: NEVER empty. Use {"role":""} or {"role":null} for remove; {"alt":"..."}, {"aria-label":"..."}, {"aria-expanded":"true"}, {"aria-haspopup":"menu"}, {"autocomplete":"email"} for update/add; {"prepend":"..."} for create.
- impact: "critical" (blocks access), "serious" (major barriers), "moderate" (noticeable), "minor" (cosmetic). Prefer moderate/minor.
- category: one of animations|buttons|aria|duplicate_ids|focus|headings|tables|forms|links|icons|images|keyboard|media.`

  const slimScannerIssues = hasScannerIssues
    ? scannerReportIssues.slice(0, 20).map((issue) => {
        const sel = issue.selectors
        const selectors = Array.isArray(sel) ? sel.slice(0, 2) : typeof sel === 'string' ? [sel] : []
        return {
          code: issue.code,
          message: typeof issue.message === 'string' ? issue.message.slice(0, 300) : issue.message,
          wcag_code: issue.wcag_code,
          severity: issue.severity,
          selectors,
        }
      })
    : []
  const scannerIssuesSection = hasScannerIssues
    ? `\n\nSCANNER ISSUES (use with HTML to prioritize fixes):\n${JSON.stringify(slimScannerIssues)}\n`
    : ''

  const userPrompt = `URL: ${url}

${existingFixesSummary}
${scannerIssuesSection}
Analyze the HTML below and suggest fixes (max 10) for elements NOT in the existing selectors list. Each fix must use the exact JSON structure; attributes must never be empty. Ensure each fix has a unique selector+attributes combination (no duplicates).

Page HTML:
\`\`\`html
${htmlSnippet}
\`\`\``

  const primaryModel = 'z-ai/glm-4.7'
  const fallbackModel = 'openai/gpt-4o-mini'

  let result = await getSuggestedFixesFromModel(primaryModel, systemPrompt, userPrompt)
  let fixes = result.fixes
  if (result.hadError && fixes.length === 0) {
    console.log('[SuggestedFixes] Primary had error, trying fallback', { fallbackModel })
    result = await getSuggestedFixesFromModel(fallbackModel, systemPrompt, userPrompt)
    fixes = result.fixes
    if (fixes.length > 0) {
      console.log('[SuggestedFixes] Fallback succeeded', { fallbackModel, count: fixes.length })
    }
  }
  if (fixes.length === 0) return []

  const normalized = fixes.map(normalizeFix)
  
  // Filter out fixes that duplicate existing fixes by selector
  // Normalize selectors for comparison (trim, lowercase, remove extra spaces)
  const normalizeSelector = (sel: string | undefined): string => {
    if (!sel || typeof sel !== 'string') return ''
    return sel.trim().toLowerCase().replace(/\s+/g, ' ')
  }

  const existingSelectors = new Set(
    existingFixes
      .map((f) => normalizeSelector(f.selector))
      .filter((s) => s.length > 0)
  )

  const withoutDuplicates = normalized.filter((f) => {
    const normalizedSel = normalizeSelector(f.selector)
    if (normalizedSel.length === 0) return true
    return !existingSelectors.has(normalizedSel)
  })

  // Deduplicate by selector+attributes (no two fixes with same selector and same attributes)
  const seenSelectorAttrs = new Set<string>()
  const withoutSelectorAttrDuplicates = withoutDuplicates.filter((f) => {
    const sel = normalizeSelector(f.selector)
    const attrsKey = JSON.stringify(f.attributes ?? {})
    const key = `${sel}::${attrsKey}`
    if (seenSelectorAttrs.has(key)) return false
    seenSelectorAttrs.add(key)
    return true
  })

  const withAttributes = withoutSelectorAttrDuplicates.filter((f) =>
    applyAllFilters(f)
  )

  console.log('[SuggestedFixes] Completed', {
    url,
    ms: Date.now() - totalStart,
    finalCount: withAttributes.length,
  })
  return withAttributes
}

const VALID_CATEGORIES = [
  'animations',
  'buttons',
  'aria',
  'duplicate_ids',
  'focus',
  'headings',
  'tables',
  'forms',
  'links',
  'icons',
  'images',
  'keyboard',
  'media',
] as const

// FixCategory type is kept for internal use and potential future exports
type FixCategory = (typeof VALID_CATEGORIES)[number]

function isValidCategory(c: string): c is FixCategory {
  return (VALID_CATEGORIES as readonly string[]).includes(c)
}

const EXACT_FORMAT_KEYS = [
  'selector',
  'issue_type',
  'wcag_criteria',
  'action',
  'attributes',
  'impact',
  'description',
  'current_value',
  'confidence',
  'wcag',
  'suggested_fix',
  'category',
] as const

function inferCategory(issueType: string | undefined): FixCategory {
  if (!issueType || typeof issueType !== 'string') return 'aria'
  const t = issueType.toLowerCase()
  if (/icon|decorative_icon|lucide/.test(t)) return 'icons'
  if (/image|alt|img|picture|cover|portrait/.test(t)) return 'images'
  if (/aria|redundant|missing_aria|sr_only|haspopup|label|expanded/.test(t)) return 'aria'
  if (/form|input|identify_input|autocomplete/.test(t)) return 'forms'
  if (/focus/.test(t)) return 'focus'
  if (/keyboard|bypass|skip/.test(t)) return 'keyboard'
  if (/link|anchor/.test(t)) return 'links'
  if (/button|btn/.test(t)) return 'buttons'
  if (/heading|h1|h2|h3/.test(t)) return 'headings'
  if (/table|thead|tbody/.test(t)) return 'tables'
  if (/duplicate|id/.test(t)) return 'duplicate_ids'
  if (/animation|motion/.test(t)) return 'animations'
  if (/media|video|audio/.test(t)) return 'media'
  return 'aria'
}

/**
 * Infer impact level based on issue_type, description, and WCAG criteria.
 * Returns one of: 'minor' | 'moderate' | 'serious' | 'critical'
 */
function inferImpact(f: AutoFixItem): 'minor' | 'moderate' | 'serious' | 'critical' {
  const issueType = (f.issue_type ?? '').toLowerCase()
  const description = (f.description ?? '').toLowerCase()
  const wcag = (f.wcag_criteria ?? f.wcag ?? '').toLowerCase()
  const suggestedFix = (f.suggested_fix ?? '').toLowerCase()

  // Critical issues - blocks access or major violations
  if (
    /color.?contrast|minimum.?contrast|1\.4\.3|1\.4\.6/.test(wcag) ||
    /contrast.*ratio|insufficient.*contrast/.test(description) ||
    /aria.*hidden.*focusable|focusable.*hidden/.test(description) ||
    /keyboard.*trap|trapped.*keyboard/.test(description) ||
    /no.*keyboard.*access|cannot.*keyboard/.test(description)
  ) {
    return 'critical'
  }

  // Serious issues - significant barriers
  if (
    /missing.*alt|no.*alt|image.*alt|1\.1\.1/.test(issueType) && !/decorative/.test(description) ||
    /missing.*label|no.*label|unlabeled|3\.3\.2/.test(issueType) ||
    /missing.*aria.*label|no.*aria.*label/.test(issueType) ||
    /form.*label|input.*label/.test(issueType) ||
    /error.*identification|error.*message|3\.3\.1/.test(description) ||
    /bypass.*blocks|skip.*link|2\.4\.1/.test(issueType) ||
    /heading.*structure|heading.*order|1\.3\.1/.test(issueType) ||
    /focus.*visible|2\.4\.7/.test(issueType)
  ) {
    return 'serious'
  }

  // Moderate issues - noticeable but manageable
  if (
    /redundant.*aria|redundant.*role/.test(issueType) ||
    /missing.*aria.*haspopup|missing.*aria.*controls|missing.*aria.*expanded/.test(issueType) ||
    /identify.*input.*purpose|autocomplete|1\.3\.5/.test(issueType) ||
    /non.*descriptive.*alt|alt.*not.*descriptive/.test(issueType) ||
    /decorative.*image|decorative.*icon/.test(issueType) ||
    /duplicate.*id/.test(issueType)
  ) {
    return 'moderate'
  }

  // Minor issues - cosmetic or low impact
  if (
    /redundant.*text|redundant.*sr/.test(issueType) ||
    /aria.*redundant/.test(description)
  ) {
    return 'minor'
  }

  // Default to moderate for unknown issues
  return 'moderate'
}

function isEmptyAttributes(v: unknown): boolean {
  if (v == null) return true
  if (typeof v !== 'object' || Array.isArray(v)) return true
  return Object.keys(v as Record<string, unknown>).length === 0
}

/**
 * Infer attributes when GPT returns empty {}.
 * Uses issue_type, suggested_fix, description, current_value, selector.
 */
function inferAttributes(f: AutoFixItem): Record<string, unknown> {
  const t = (f.issue_type ?? '').toLowerCase()
  const fix = (f.suggested_fix ?? '').toLowerCase()
  const desc = (f.description ?? '').toLowerCase()
  const cur = f.current_value ?? ''
  const selector = (f.selector ?? '').toLowerCase()

  if (/redundant_aria_role|redundant.*role/.test(t)) return { role: null }
  if (/aria_expanded|expanded_missing/.test(t)) return { 'aria-expanded': 'true' }
  if (/missing_aria_haspopup|haspopup/.test(t)) {
    if (/menu|nav|dropdown/.test(fix) || /menu|nav|dropdown/.test(desc)) return { 'aria-haspopup': 'menu' }
    if (/dialog|modal|popup/.test(fix) || /dialog|modal/.test(desc)) return { 'aria-haspopup': 'dialog' }
    return { 'aria-haspopup': 'menu' }
  }
  if (/missing_aria_controls|aria.?controls/.test(t)) {
    const controlsId = extractAriaControlsFromSuggestedFix(f.suggested_fix) ?? extractIdFromSelector(selector)
    return { 'aria-controls': controlsId || 'submenu-id' }
  }
  if (/bypass_blocks|skip.*link|skip to main/.test(t) || /skip to main|skip link/.test(fix)) {
    return { prepend: '<a href="#main-content" class="skip-link">Skip to main content</a>' }
  }
  if (/identify_input_purpose|autocomplete|input.*purpose/.test(t)) {
    if (/email|e-mail/.test(fix) || /email|e-mail/.test(desc)) return { autocomplete: 'email' }
    if (/name|full.?name/.test(fix) || /name/.test(desc)) return { autocomplete: 'name' }
    return { autocomplete: 'email' }
  }
  if (/redundant_text|redundant_sr|redundant_screen|sr_only|screen_reader/.test(t)) {
    if (/remove|delete/.test(fix)) return { 'aria-hidden': 'true' }
    return { 'aria-hidden': 'true' }
  }
  if (/decorative_icon|decorative.*icon|icon.*decorative/.test(t)) return { 'aria-hidden': 'true', role: 'presentation' }
  if (/non_descriptive_alt|missing_alt|image_alt|alt_text|decorative_image|image_in_link/.test(t)) {
    const alt = extractAltFromSuggestedFix(f.suggested_fix) ?? (cur || '')
    return { alt: alt || '' }
  }
  if (/missing_aria_label|aria.?label/.test(t)) {
    const label = extractAriaLabelFromSuggestedFix(f.suggested_fix) ?? 'Accessible name'
    return { 'aria-label': label }
  }
  return {}
}

function extractAltFromSuggestedFix(s: string | undefined): string | null {
  if (!s || typeof s !== 'string') return null
  // Try multiple patterns: "e.g., 'Portrait of...'", "alt to '...'", "use '...'", "change to '...'", "alt='...'"
  const patterns = [
    /e\.g\.\s*,\s*["']([^"']+)["']/i,
    /alt\s*(?:to|[:=])\s*["']?([^"']+)["']?/i,
    /use\s+["']([^"']+)["']/i,
    /change\s+to\s+["']([^"']+)["']/i,
    /update\s+alt\s+text\s+to\s+["']([^"']+)["']/i,
    /describe.*as\s+["']([^"']+)["']/i,
    /["']([^"']+)["']/,
  ]
  for (const pattern of patterns) {
    const m = s.match(pattern)
    if (m && m[1] && m[1].length > 3) return m[1].trim()
  }
  return null
}

function extractAriaLabelFromSuggestedFix(s: string | undefined): string | null {
  if (!s || typeof s !== 'string') return null
  const m = s.match(/aria-label\s*=\s*["']([^"']+)["']/i) ?? s.match(/["']([^"']+)["']/)
  return m ? m[1].trim() : null
}

function extractAriaControlsFromSuggestedFix(s: string | undefined): string | null {
  if (!s || typeof s !== 'string') return null
  // Look for "ID of the controlled submenu", "referencing the ID", "aria-controls='...'", etc.
  const m = s.match(/aria-controls\s*=\s*["']([^"']+)["']/i) ?? s.match(/id\s+of\s+the\s+controlled\s+(\w+)/i) ?? s.match(/id[:\s]+([a-z0-9_-]+)/i)
  return m ? m[1].trim() : null
}

function extractIdFromSelector(selector: string): string | null {
  if (!selector || typeof selector !== 'string') return null
  // Try to extract ID from selector like "#submenu-id", "[id='submenu-id']", etc.
  const m = selector.match(/#([a-z0-9_-]+)/i) ?? selector.match(/\[id\s*=\s*["']([^"']+)["']\]/i)
  return m ? m[1].trim() : null
}

function normalizeFix(f: AutoFixItem): AutoFixItem {
  const raw = f.category?.trim() || inferCategory(f.issue_type)
  const category = isValidCategory(raw) ? raw : inferCategory(f.issue_type)
  const rawAction = (f as { action?: string }).action
  const validActions = ['update', 'add', 'remove', 'create'] as const
  const action = validActions.includes(rawAction as (typeof validActions)[number])
    ? (rawAction as (typeof validActions)[number])
    : (f.action ?? 'update')
  const wcag = f.wcag ?? f.wcag_criteria ?? ''
  const wcag_criteria = f.wcag_criteria ?? wcag
  let attrs = f.attributes ?? {}
  if (isEmptyAttributes(attrs)) {
    const inferred = inferAttributes(f)
    attrs = Object.keys(inferred).length > 0 ? inferred : attrs
  }
  
  // Normalize impact - if GPT returns "serious" for everything, infer based on issue type
  let impact = f.impact?.toLowerCase()?.trim()
  const validImpacts = ['minor', 'moderate', 'serious', 'critical']
  if (!impact || !validImpacts.includes(impact)) {
    // If impact is missing or invalid, infer it
    impact = inferImpact(f)
  } else {
    // If GPT says "serious" but the issue type suggests it should be lower, re-evaluate
    const inferredImpact = inferImpact(f)
    // Only override if GPT's impact seems too high (e.g., "serious" for redundant ARIA)
    if (impact === 'serious' && (inferredImpact === 'minor' || inferredImpact === 'moderate')) {
      impact = inferredImpact
    } else if (impact === 'critical' && inferredImpact !== 'critical') {
      impact = inferredImpact
    }
  }
  
  const out: Record<string, unknown> = {
    ...f,
    category,
    action,
    wcag_criteria,
    wcag,
    attributes: attrs,
    impact,
    current_value: f.current_value ?? null,
    confidence: typeof f.confidence === 'number' ? f.confidence : 0.9,
  }
  return toExactFormat(out as AutoFixItem)
}

function toExactFormat(f: AutoFixItem): AutoFixItem {
  const obj: Record<string, unknown> = {}
  const src = f as Record<string, unknown>
  for (const k of EXACT_FORMAT_KEYS) {
    let v = src[k]
    if (v === undefined) {
      if (k === 'current_value') v = null
      else if (k === 'confidence') v = 0.9
      else if (k === 'attributes') v = {}
      else v = ''
    }
    obj[k] = v
  }
  return obj as AutoFixItem
}

function getMessageContent(msg: { content?: unknown } | null): string {
  if (!msg?.content) return ''
  const c = msg.content
  if (typeof c === 'string') return c.trim()
  if (Array.isArray(c)) {
    return c
      .map((p) => (p && typeof p === 'object' && 'text' in p && typeof (p as { text?: unknown }).text === 'string' ? (p as { text: string }).text : ''))
      .filter(Boolean)
      .join('\n')
      .trim()
  }
  return ''
}

type ModelResult = { fixes: AutoFixItem[]; hadError: boolean }

async function getSuggestedFixesFromModel(
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<ModelResult> {
  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      tools: [SUGGESTED_FIXES_FUNCTION_SCHEMA],
      tool_choice: { type: 'function', function: { name: 'suggest_accessibility_fixes' } },
      temperature: 0.1,
      max_tokens: 1500,
    })

    const msg = completion.choices[0]?.message
    const toolCall = msg?.tool_calls?.[0]

    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments) as { suggested_fixes?: AutoFixItem[] }
        const fixes = Array.isArray(parsed.suggested_fixes) ? parsed.suggested_fixes : []
        return { fixes, hadError: false }
      } catch (e) {
        console.error('[SuggestedFixes] Failed to parse tool call arguments:', {
          error: e instanceof Error ? e.message : String(e),
          argumentsPreview: toolCall.function.arguments?.slice(0, 200),
        })
        return { fixes: [], hadError: true }
      }
    }

    const content = getMessageContent(msg ?? null)
    if (content) {
      const fixes = parseFixesFromContent(content)
      return { fixes, hadError: false }
    }

    const finishReason = completion.choices[0]?.finish_reason
    if (String(finishReason) === 'error') {
      const errMsg = msg && typeof msg === 'object' && 'content' in msg ? (msg as { content?: unknown }).content : null
      console.error('[SuggestedFixes] API returned finish_reason=error', {
        finishReason,
        model,
        errorContent: typeof errMsg === 'string' ? errMsg?.slice(0, 500) : errMsg,
      })
      return { fixes: [], hadError: true }
    }
    return { fixes: [], hadError: true }
  } catch (e) {
    console.error('[SuggestedFixes] Model call failed', {
      error: e instanceof Error ? e.message : String(e),
    })
    return { fixes: [], hadError: true }
  }
}

function parseFixesFromContent(content: string): AutoFixItem[] {
  let raw = content
  const jsonBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonBlock) raw = jsonBlock[1].trim()
  let data: unknown = null
  try {
    data = JSON.parse(raw) as unknown
  } catch {
    const repaired = repairTruncatedJson(raw)
    if (repaired) {
      try {
        data = JSON.parse(repaired) as unknown
      } catch {
        return []
      }
    } else {
      return []
    }
  }
  if (Array.isArray(data)) return data as AutoFixItem[]
  if (data && typeof data === 'object' && 'suggested_fixes' in data) {
    const arr = (data as { suggested_fixes?: unknown }).suggested_fixes
    return Array.isArray(arr) ? (arr as AutoFixItem[]) : []
  }
  return []
}

/**
 * If the model output was truncated (max_tokens), try to close the JSON and parse.
 * Trims trailing incomplete key like ", \"d" or ", \"desc\" then appends ]}.
 */
function repairTruncatedJson(raw: string): string | null {
  if (!raw.includes('"suggested_fixes"') || !raw.includes('[')) return null
  let s = raw.trim()
  const trailingIncomplete = s.match(/,\s*"[^"]*"?\s*$/)
  if (trailingIncomplete) s = s.slice(0, -trailingIncomplete[0].length)
  s = s.trimEnd()
  if (s.endsWith(',')) s = s.slice(0, -1)
  if (s.endsWith('}]}')) return s
  if (s.endsWith(']}')) return s
  if (s.endsWith('}')) return s + ']}'
  return s + '}]}'
}
