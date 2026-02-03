import { gunzip } from 'zlib'
import { promisify } from 'util'
import { tursoClient } from '../config/turso.config'

const gunzipAsync = promisify(gunzip)

/** In-memory cache for page HTML to avoid repeated DB fetches. TTL 5 min, max 100 entries. */
const PAGE_HTML_CACHE_MAX = 100
const PAGE_HTML_CACHE_TTL_MS = 5 * 60 * 1000
const pageHtmlCache = new Map<string, { html: string; expiresAt: number }>()

const GZIP_MAGIC = Buffer.from([0x1f, 0x8b])

function isHexString(s: string): boolean {
  return /^[0-9a-fA-F]+$/.test(s) && s.length % 2 === 0
}

function isBase64Like(s: string): boolean {
   return /^[A-Za-z0-9+/=]+$/.test(s) && s.length >= 4
}

/**
 * Normalize blob from DB into a Buffer suitable for gunzip.
 * Handles: Buffer, Uint8Array, or hex string (e.g. "1f8b0800b57e726902ff...").
 * Hex may include spaces/newlines or optional "0x" prefix; all are stripped.
 */
function toGzipBuffer(blob: unknown): Buffer | null {
  if (blob == null) return null
  if (Buffer.isBuffer(blob)) return blob
  if (blob instanceof Uint8Array) return Buffer.from(blob)
  if (blob instanceof ArrayBuffer) return Buffer.from(blob)
  if (typeof blob !== 'string') return null

  let s = blob.trim()
  if (!s) return null

  try {
    s = s.replace(/\s/g, '').replace(/^0x/i, '')
    if (!s) return null

    if (isHexString(s)) {
      return Buffer.from(s, 'hex')
    }
    if (isBase64Like(s)) {
      return Buffer.from(s, 'base64')
    }
    return null
  } catch {
    return null
  }
}

function parseUrlParts(url: string): { domain: string; pathLike: string } | null {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`)
    const host = u.hostname.replace(/^www\./i, '').toLowerCase()
    const path = u.pathname || '/'
    const pathLike = path === '/' ? '' : path.replace(/\/$/, '')
    return { domain: host, pathLike }
  } catch {
    return null
  }
}

async function runQuery(
  url: string,
  urlHash: string | null
): Promise<{ row: Record<string, unknown>; blob: Buffer | null } | null> {
  type Try = { label: string; sql: string; args: string[] }
  const baseSelect = `
    SELECT url_hash, url, domain, html_compressed, fetched_at, expires_at
    FROM page_cache
  `
  const orderLimit = ` ORDER BY fetched_at DESC LIMIT 1`
  const tries: Try[] = [
    { label: 'url exact', sql: `${baseSelect} WHERE url = ?${orderLimit}`, args: [url] },
  ]

  if (url.endsWith('/') && url.length > 1) {
    tries.push({ label: 'url no slash', sql: tries[0].sql, args: [url.slice(0, -1)] })
  } else if (!url.endsWith('/')) {
    tries.push({ label: 'url with slash', sql: tries[0].sql, args: [url + '/'] })
  }

  if (urlHash && urlHash.trim()) {
    tries.push({
      label: 'url_hash',
      sql: `${baseSelect} WHERE url_hash = ?${orderLimit}`,
      args: [urlHash.trim()],
    })
  }

  const parts = parseUrlParts(url)
  if (parts && parts.pathLike) {
    const likePath = `%${parts.pathLike}%`
    tries.push({
      label: 'domain+path LIKE',
      sql: `${baseSelect} WHERE domain = ? AND url LIKE ?${orderLimit}`,
      args: [parts.domain, likePath],
    })
    tries.push({
      label: 'url LIKE domain+path',
      sql: `${baseSelect} WHERE url LIKE ?${orderLimit}`,
      args: [`%${parts.domain}%${parts.pathLike}%`],
    })
    const pathSegment = parts.pathLike.split('/').filter(Boolean).pop()
    if (pathSegment) {
      tries.push({
        label: 'path-only LIKE',
        sql: `${baseSelect} WHERE url LIKE ?${orderLimit}`,
        args: [`%${pathSegment}%`],
      })
    }
  }

  tries.push({
    label: 'TRIM(url)',
    sql: `${baseSelect} WHERE TRIM(url) = ?${orderLimit}`,
    args: [url],
  })

  for (const { sql, args } of tries) {
    const result = await tursoClient.execute({ sql, args })
    if (result.rows.length === 0) continue

    const row = result.rows[0] as Record<string, unknown>
    const raw = row.html_compressed
    const buf = toGzipBuffer(raw)

    if (buf && buf.length >= 2 && buf[0] === GZIP_MAGIC[0] && buf[1] === GZIP_MAGIC[1]) {
      return { row, blob: buf }
    }
  }

  return null
}

export type GetPageHtmlOptions = {
  url: string
  urlHash?: string | null
}

/**
 * Fetches decompressed HTML for a URL from page_cache.
 * Tries exact url, then url with/without trailing slash, then url_hash if provided.
 * Accepts html_compressed as Buffer, Uint8Array, hex string, or base64 string.
 *
 * @param options - { url, urlHash? }
 * @returns Decompressed HTML string or null if not found / decompression fails
 */
export async function getPageHtmlByUrl(
  options: GetPageHtmlOptions | string
): Promise<string | null> {
  const url = typeof options === 'string' ? options : options?.url
  const urlHash = typeof options === 'string' ? null : options?.urlHash ?? null

  if (!url || typeof url !== 'string' || !url.trim()) {
    return null
  }

  const trimmed = url.trim()
  const cacheKey = `${trimmed}|${urlHash || ''}`

  const cached = pageHtmlCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.html

  try {
    const out = await runQuery(trimmed, urlHash)
    if (!out) return null

    const { blob } = out
    if (!blob) return null

    const decompressed = await gunzipAsync(blob)
    const html = decompressed.toString('utf-8')

    if (pageHtmlCache.size >= PAGE_HTML_CACHE_MAX) {
      const firstKey = pageHtmlCache.keys().next().value
      if (firstKey != null) pageHtmlCache.delete(firstKey)
    }
    pageHtmlCache.set(cacheKey, { html, expiresAt: Date.now() + PAGE_HTML_CACHE_TTL_MS })

    return html
  } catch (err) {
    console.error('[PageCacheRepository] Error fetching/decompressing page HTML:', {
      error: err instanceof Error ? err.message : String(err),
      url: trimmed,
      urlHash: urlHash || '(none)',
    })
    return null
  }
}
