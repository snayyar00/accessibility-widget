import * as dns from 'node:dns/promises'

import { Request, Response } from 'express'

/** Private/reserved IP ranges — reject to prevent SSRF (e.g. IMDS, localhost, VPC) */
const BLOCKED_IP_RANGES = [
  /^127\./, // IPv4 loopback
  /^10\./, // IPv4 private
  /^172\.(1[6-9]|2\d|3[01])\./, // IPv4 private 172.16.0.0/12
  /^192\.168\./, // IPv4 private
  /^169\.254\./, // IPv4 link-local (e.g. AWS IMDS)
  /^0\./, // IPv4 "this" network
  /^::1$/, // IPv6 loopback
  /^fd/i, // IPv6 unique local
  /^fe80/i, // IPv6 link-local
  /^::ffff:(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|0\.)/, // IPv4-mapped private
]

/**
 * Returns true if the URL targets a private/reserved address or uses a blocked scheme (SSRF-safe to block).
 */
async function isBlockedUrl(urlString: string): Promise<boolean> {
  let url: URL
  try {
    url = new URL(urlString)
  } catch {
    return true
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    return true
  }

  const hostname = url.hostname
  if (!hostname) return true

  let address: string
  try {
    const result = await dns.lookup(hostname, { order: 'ipv4first' })
    address = result.address
  } catch {
    return true
  }

  return BLOCKED_IP_RANGES.some((r) => r.test(address))
}

/**
 * Proxy image fetch to avoid CORS issues.
 * SSRF-hardened: only http(s) URLs to public IPs; response must be image/*.
 * Endpoint: POST /proxy-image
 * Body: { imageUrl: string }
 * Returns: { base64: string } - base64 encoded image data URL
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

    // Validate URL format
    let url: URL
    try {
      url = new URL(imageUrl)
    } catch {
      return res.status(400).json({
        error: 'Invalid URL format',
        message: 'Please provide a valid image URL',
      })
    }

    // SSRF: reject private/reserved hosts and non-http(s) schemes
    if (await isBlockedUrl(imageUrl)) {
      return res.status(403).json({
        error: 'URL not allowed',
        message: 'Image URL must be a public http or https address',
      })
    }

    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'WebAbility-Image-Proxy/1.0',
      },
    })

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Failed to fetch image',
        message: `HTTP ${response.status}: ${response.statusText}`,
      })
    }

    const contentType = response.headers.get('content-type') ?? ''
    const mediaType = contentType.split(';')[0].trim().toLowerCase()
    if (!mediaType.startsWith('image/')) {
      return res.status(415).json({
        error: 'Invalid content type',
        message: 'Response must be an image (content-type: image/*)',
      })
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString('base64')
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
