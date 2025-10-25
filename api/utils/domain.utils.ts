import { Request } from 'express'
import { getDomain, parse } from 'tldts'
/**
 * Utility functions for handling domain names and URLs
 */

/**
 * Cleans and normalizes a domain or URL string
 * @param input - The domain or URL to clean
 * @returns The cleaned domain with proper https:// prefix
 *
 * @example
 * cleanDomain('example.com') // 'https://www.example.com'
 * cleanDomain('http://example.com/path') // 'https://www.example.com'
 * cleanDomain('www.example.com') // 'https://www.example.com'
 * cleanDomain('https://subdomain.example.com?query=1') // 'https://www.subdomain.example.com'
 */
export function cleanDomain(input: string): string {
  if (!input) {
    return ''
  }

  let domain = input.trim().toLowerCase()

  // Remove protocols if they exist
  domain = domain.replace(/^(https?:\/\/)?(www\.)?/i, '')

  // Remove any paths, query params, or hashes
  domain = domain.split('/')[0]

  // Remove any remaining special characters
  domain = domain.replace(/[^a-z0-9.-]/g, '')

  // Check if www. is needed
  if (!domain.startsWith('www.')) {
    domain = `www.${domain}`
  }

  // Add https:// prefix
  return `https://${domain}`
}

/**
 * Formats a URL with proper www prefix for initial accessibility scan
 * @param url - The URL to format
 * @returns The formatted URL with www prefix if needed
 *
 * @example
 * formatUrlForScan('example.com') // 'https://www.example.com'
 * formatUrlForScan('https://example.com') // 'https://www.example.com'
 * formatUrlForScan('http://www.example.com/path') // 'https://www.example.com'
 * formatUrlForScan('subdomain.example.com') // 'https://www.subdomain.example.com'
 */
export function formatUrlForScan(url: string): string {
  if (!url) {
    return ''
  }

  const cleanUrl = cleanDomain(url)

  // Add www. if it's not present
  if (!cleanUrl.includes('//www.')) {
    return cleanUrl.replace('https://', 'https://www.')
  }

  return cleanUrl
}

/**
 * Attempts different domain variations for retrying accessibility scans
 * @param url - The original URL that failed
 * @returns Array of URLs to try in order
 *
 * @example
 * getRetryUrls('example.com')
 * // Returns: [
 * //   'https://www.example.com',
 * //   'https://example.com',
 * //   'http://www.example.com',
 * //   'http://example.com'
 * // ]
 * getRetryUrls('https://subdomain.example.com/path')
 * // Returns: [
 * //   'https://www.subdomain.example.com',
 * //   'https://subdomain.example.com',
 * //   'http://www.subdomain.example.com',
 * //   'http://subdomain.example.com'
 * // ]
 */
export function getRetryUrls(url: string): string[] {
  if (!url) {
    return []
  }

  let domain = url.trim().toLowerCase()

  // Remove protocols if they exist
  domain = domain.replace(/^(https?:\/\/)?(www\.)?/i, '')

  // Remove any paths, query params, or hashes
  domain = domain.split('/')[0]

  // Remove any remaining special characters
  domain = domain.replace(/[^a-z0-9.-]/g, '')

  return [
    `https://www.${domain}`, // Try with www first
    `https://${domain}`, // Then without www
    `http://www.${domain}`, // Then try http with www
    `http://${domain}`, // Finally http without www
  ]
}

/**
 * Normalizes domain by removing protocol and www prefix
 * @param url - URL to normalize
 * @returns Normalized domain without protocol and www
 *
 * @example
 * normalizeDomain('https://www.example.com') // 'example.com'
 * normalizeDomain('http://example.com') // 'example.com'
 * normalizeDomain('www.example.com') // 'example.com'
 * normalizeDomain('example.com') // 'example.com'
 * normalizeDomain('https://subdomain.example.com/path/') // 'subdomain.example.com'
 */
export function normalizeDomain(url: string | null): string {
  if (!url || typeof url !== 'string') {
    return ''
  }

  return url
    .trim()
    .toLowerCase()
    .replace(/^(https?:\/\/)?(www\.)?/, '') // Remove protocol and www
    .replace(/\/.*/, '') // Remove everything after first slash (path, query, etc)
    .replace(/\/$/, '') // Remove trailing slash (if any left)
}

interface RootDomainOptions {
  validHosts?: string[]
  allowPrivateDomains?: boolean
}

export function isIpAddress(value: string): boolean {
  if (!value) return false
  // Use tldts.parse to check for IP. It's more robust.
  // Pass extractHostname: false because 'value' is already a hostname/IP.
  // Pass validateHostname: false to prevent tldts from rejecting if it's just an IP string.
  const parsed = parse(value, { extractHostname: false, validateHostname: false })
  return parsed.isIp || false
}

/**
 * Extracts the root domain (e.g., example.com, example.co.uk) from a given URL or hostname string.
 * Handles IP addresses and localhost appropriately.
 *
 * @param urlOrHostname - The URL or hostname string to parse.
 * @param options - Optional configuration for tldts.
 * @returns The root domain, IP, localhost, or a cleaned version of the input if no root domain is found.
 */
export function getRootDomain(urlOrHostname: string, options?: RootDomainOptions): string {
  if (!urlOrHostname || typeof urlOrHostname !== 'string') {
    return ''
  }

  let cleanedInput: string
  try {
    const urlObj = new URL(urlOrHostname.startsWith('http') ? urlOrHostname : `http://${urlOrHostname}`)
    cleanedInput = urlObj.hostname
  } catch {
    cleanedInput = urlOrHostname.replace(/^(https?:\/\/)?(www\.)?/, '')
    const parts = cleanedInput.split(/[\/?#]/)
    cleanedInput = parts[0]
    cleanedInput = cleanedInput.replace(/:\d+$/, '')
  }

  if (isIpAddress(cleanedInput)) {
    return cleanedInput
  }

  if (cleanedInput.toLowerCase() === 'localhost') {
    return 'localhost'
  }

  const tldtsOptions = {
    validHosts: options?.validHosts || ['localhost'],
    allowPrivateDomains: options?.allowPrivateDomains || false,
  }

  try {
    const domainInfo = getDomain(urlOrHostname, tldtsOptions)

    if (domainInfo) {
      return domainInfo
    }

    return cleanedInput // Fallback to the cleaned input
  } catch (error) {
    console.error('Error parsing domain with tldts:', error)
    return cleanedInput // Fallback in case of tldts error
  }
}

/**
 * Helper function to extract client domain from request headers
 */
export function getDomainFromRequest(req: Request): string | null {
  const origin = req.headers.origin || req.headers.referer

  if (origin) {
    try {
      const url = new URL(origin)

      return url.port ? `${normalizeDomain(url.hostname)}:${url.port}` : normalizeDomain(url.hostname)
    } catch {
      return null
    }
  } else if (req.headers.host) {
    return normalizeDomain(req.headers.host)
  }

  return null
}
