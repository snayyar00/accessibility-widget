import * as dns from 'node:dns/promises'
import * as http from 'node:http'
import * as https from 'node:https'
import { isIP } from 'node:net'

import { Request, Response } from 'express'

/** Max response body size (5MB) to avoid memory exhaustion; base64 adds ~33% overhead. */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

/**
 * Returns true if the IPv4 address is in a private/reserved range (non-globally-routable).
 */
function isPrivateIPv4(addr: string): boolean {
  const parts = addr.split('.').map(Number)
  if (parts.length !== 4 || parts.some((n) => n < 0 || n > 255 || Number.isNaN(n))) return true
  const [a, b, c] = parts
  if (a === 0) return true // 0.0.0.0/8
  if (a === 10) return true // 10.0.0.0/8
  if (a === 127) return true // 127.0.0.0/8
  if (a === 169 && b === 254) return true // 169.254.0.0/16
  if (a === 172 && b >= 16 && b <= 31) return true // 172.16.0.0/12
  if (a === 192 && b === 168) return true // 192.168.0.0/16
  return false
}

/**
 * Expands an IPv6 string to 8 uint16 words (big-endian). Returns null if invalid.
 */
function parseIPv6(addr: string): number[] | null {
  const parts = addr.toLowerCase().split(':')
  if (parts.length < 3 || parts.length > 8) return null
  const out: number[] = []
  let gap = -1
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === '') {
      if (gap >= 0) return null
      gap = i
      continue
    }
    const n = parseInt(parts[i], 16)
    if (Number.isNaN(n) || n < 0 || n > 0xffff) return null
    out.push(n)
  }
  if (gap >= 0) {
    const fill = 8 - out.length
    if (fill < 1) return null
    const before = out.slice(0, gap === 0 ? 0 : gap)
    const after = out.slice(gap)
    return [...before, ...Array(fill).fill(0), ...after]
  }
  return out.length === 8 ? out : null
}

/**
 * Returns true if the IPv6 address is in a private/reserved range (non-globally-routable).
 * Covers loopback, link-local (fe80::/10), ULA (fc00::/7), and IPv4-mapped private.
 */
function isPrivateIPv6(addr: string): boolean {
  const words = parseIPv6(addr)
  if (!words || words.length !== 8) return true

  // :: (unspecified)
  if (words.every((w) => w === 0)) return true

  // ::1 (loopback)
  if (words[0] === 0 && words[1] === 0 && words[2] === 0 && words[3] === 0 && words[4] === 0 && words[5] === 0 && words[6] === 0 && words[7] === 1) return true

  // fe80::/10 (link-local)
  if (words[0] >= 0xfe80 && words[0] <= 0xfebf) return true

  // fc00::/7 (ULA)
  if (words[0] >= 0xfc00 && words[0] <= 0xfdff) return true

  // ::ffff:0:0/96 — IPv4-mapped; check embedded IPv4 for private
  if (words[0] === 0 && words[1] === 0 && words[2] === 0 && words[3] === 0 && words[4] === 0 && words[5] === 0xffff) {
    const hi = words[6]
    const lo = words[7]
    const a = hi >> 8
    const b = hi & 0xff
    const c = lo >> 8
    const d = lo & 0xff
    const mapped = `${a}.${b}.${c}.${d}`
    return isPrivateIPv4(mapped)
  }

  return false
}

/**
 * Returns true if the address is private/reserved (SSRF-unsafe to allow).
 */
function isPrivateAddress(address: string): boolean {
  const family = isIP(address)
  if (family === 4) return isPrivateIPv4(address)
  if (family === 6) return isPrivateIPv6(address)
  return true
}

/**
 * Resolve hostname to all A and AAAA records; reject if any is private (prevents DNS rebinding).
 * Returns the first public IP to use for connection pinning.
 */
async function getPinnedPublicAddress(hostname: string): Promise<{ address: string; family: 4 | 6 }> {
  const [v4, v6] = await Promise.all([dns.resolve4(hostname, { ttl: false }).catch(() => [] as string[]), dns.resolve6(hostname, { ttl: false }).catch(() => [] as string[])])
  const toAddr = (a: string | { address: string }): string => (typeof a === 'string' ? a : a.address)
  const all = [...v4.map((a) => ({ address: toAddr(a), family: 4 as const })), ...v6.map((a) => ({ address: toAddr(a), family: 6 as const }))]
  if (all.length === 0) throw new Error('No addresses resolved')
  const anyPrivate = all.some(({ address }) => isPrivateAddress(address))
  if (anyPrivate) throw new Error('Resolved to private address')
  return all[0]
}

/**
 * Returns true if the URL should be blocked (invalid, non-http(s), or resolves to private IPs).
 */
async function isBlockedUrl(urlString: string): Promise<boolean> {
  let url: URL
  try {
    url = new URL(urlString)
  } catch {
    return true
  }
  if (!['http:', 'https:'].includes(url.protocol)) return true
  const hostname = url.hostname
  if (!hostname) return true
  try {
    await getPinnedPublicAddress(hostname)
    return false
  } catch {
    return true
  }
}

/**
 * Fetch URL using only the pre-validated public IP (pinned) to prevent DNS rebinding.
 */
function fetchWithPinnedIp(imageUrl: string, pinned: { address: string; family: 4 | 6 }, hostname: string): Promise<{ statusCode: number; statusMessage: string; headers: http.IncomingHttpHeaders; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const url = new URL(imageUrl)
    const isHttps = url.protocol === 'https:'
    const port = url.port || (isHttps ? 443 : 80)
    const path = url.pathname + url.search

    const options: https.RequestOptions = {
      hostname: pinned.address,
      port,
      path,
      method: 'GET',
      headers: {
        Host: hostname,
        'User-Agent': 'WebAbility-Image-Proxy/1.0',
      },
      rejectUnauthorized: isHttps,
      servername: isHttps ? hostname : undefined, // SNI and cert verification use original hostname
    }

    const req = (isHttps ? https : http).request(options, (res) => {
      const chunks: Buffer[] = []
      let total = 0
      const onData = (chunk: Buffer) => {
        total += chunk.length
        if (total > MAX_IMAGE_BYTES) {
          res.destroy()
          reject(new Error('Response too large'))
          return
        }
        chunks.push(chunk)
      }
      res.on('data', onData)
      res.on('end', () =>
        resolve({
          statusCode: res.statusCode ?? 0,
          statusMessage: res.statusMessage ?? '',
          headers: res.headers,
          body: Buffer.concat(chunks),
        }),
      )
      res.on('error', reject)
    })
    req.on('error', reject)
    req.end()
  })
}

/**
 * Proxy image fetch to avoid CORS issues.
 * SSRF-hardened: only http(s), all resolved IPs must be public, connection pinned to validated IP, response must be image/*, size capped.
 */
export async function proxyImage(req: Request, res: Response): Promise<Response> {
  try {
    const { imageUrl } = req.body

    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({
        error: 'imageUrl is required',
        message: 'Please provide a valid imageUrl in the request body',
      })
    }

    let url: URL
    try {
      url = new URL(imageUrl)
    } catch {
      return res.status(400).json({
        error: 'Invalid URL format',
        message: 'Please provide a valid image URL',
      })
    }

    if (!['http:', 'https:'].includes(url.protocol)) {
      return res.status(400).json({
        error: 'Invalid URL scheme',
        message: 'Only http and https are allowed',
      })
    }

    const hostname = url.hostname
    let pinned: { address: string; family: 4 | 6 }
    try {
      pinned = await getPinnedPublicAddress(hostname)
    } catch {
      return res.status(403).json({
        error: 'URL not allowed',
        message: 'Image URL must resolve to a public http or https address',
      })
    }

    let response: { statusCode: number; statusMessage: string; headers: http.IncomingHttpHeaders; body: Buffer }
    try {
      response = await fetchWithPinnedIp(imageUrl, pinned, hostname)
    } catch (err) {
      if (err instanceof Error && err.message === 'Response too large') {
        return res.status(413).json({
          error: 'Response too large',
          message: `Image size must not exceed ${MAX_IMAGE_BYTES / 1024 / 1024}MB`,
        })
      }
      throw err
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      return res.status(response.statusCode).json({
        error: 'Failed to fetch image',
        message: `HTTP ${response.statusCode}: ${response.statusMessage}`,
      })
    }

    const contentLength = response.headers['content-length']
    if (contentLength !== undefined) {
      const len = parseInt(contentLength, 10)
      if (!Number.isNaN(len) && len > MAX_IMAGE_BYTES) {
        return res.status(413).json({
          error: 'Response too large',
          message: `Image size must not exceed ${MAX_IMAGE_BYTES / 1024 / 1024}MB`,
        })
      }
    }

    const contentType = response.headers['content-type'] ?? ''
    const mediaType = contentType.split(';')[0].trim().toLowerCase()
    if (!mediaType.startsWith('image/')) {
      return res.status(415).json({
        error: 'Invalid content type',
        message: 'Response must be an image (content-type: image/*)',
      })
    }

    const base64 = response.body.toString('base64')
    const dataUrl = `data:${mediaType};base64,${base64}`

    return res.json({
      success: true,
      base64: dataUrl,
    })
  } catch (error) {
    console.error('Error proxying image:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while fetching the image',
    })
  }
}
