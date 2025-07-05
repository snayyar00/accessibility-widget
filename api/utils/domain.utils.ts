/**
 * Utility functions for handling domain names and URLs with security features
 */

/**
 * List of dangerous protocols that should be rejected
 */
const DANGEROUS_PROTOCOLS = ['javascript:', 'data:', 'vbscript:', 'file:', 'about:', 'blob:'];

/**
 * Validates if a URL is safe from injection attacks
 * @param url - The URL to validate
 * @returns true if safe, false otherwise
 */
export function isSafeUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  const lowerUrl = url.toLowerCase().trim();

  // Check for dangerous protocols
  for (const protocol of DANGEROUS_PROTOCOLS) {
    if (lowerUrl.includes(protocol)) {
      return false;
    }
  }

  // Check for null bytes and other dangerous characters
  if (url.includes('\0') || url.includes('\r') || url.includes('\n')) {
    return false;
  }

  // Check decoded version for double-encoding attacks
  try {
    const decoded = decodeURIComponent(url);
    const lowerDecoded = decoded.toLowerCase();
    for (const protocol of DANGEROUS_PROTOCOLS) {
      if (lowerDecoded.includes(protocol)) {
        return false;
      }
    }
  } catch {
    // If decoding fails, continue validation
  }

  return true;
}

/**
 * Cleans and normalizes a domain or URL string
 * @param input - The domain or URL to clean
 * @returns The cleaned domain with proper https:// prefix
 */
export function cleanDomain(input: string): string {
  if (!input) {
    return '';
  }

  let domain = input.trim().toLowerCase();

  // Remove protocols if they exist
  domain = domain.replace(/^(https?:\/\/)?(www\.)?/i, '');

  // Remove any paths, query params, or hashes
  domain = domain.split('/')[0];

  // Remove any remaining special characters
  domain = domain.replace(/[^a-z0-9.-]/g, '');

  // Check if www. is needed
  if (!domain.startsWith('www.')) {
    domain = 'www.' + domain;
  }

  // Add https:// prefix
  return `https://${domain}`;
}

/**
 * Formats a URL with proper www prefix for initial accessibility scan
 * @param url - The URL to format
 * @returns The formatted URL with www prefix if needed
 */
export function formatUrlForScan(url: string): string {
  if (!url) {
    return '';
  }

  let formattedUrl = url.trim();

  // If it already has a protocol, use it as is
  if (formattedUrl.match(/^https?:\/\//i)) {
    return formattedUrl;
  }

  // Otherwise, clean and format it
  const cleanUrl = cleanDomain(url);

  // Add www. if it's not present
  if (!cleanUrl.includes('//www.')) {
    return cleanUrl.replace('https://', 'https://www.');
  }

  return cleanUrl;
}

/**
 * Attempts different domain variations for retrying accessibility scans
 * @param url - The original URL that failed
 * @returns Array of URLs to try in order
 */
export function getRetryUrls(url: string): string[] {
  if (!url) {
    return [];
  }

  let domain = url.trim().toLowerCase();
  
  // Remove protocols if they exist
  domain = domain.replace(/^(https?:\/\/)?(www\.)?/i, '');

  // Remove any paths, query params, or hashes
  domain = domain.split('/')[0];

  // Remove any remaining special characters
  domain = domain.replace(/[^a-z0-9.-]/g, '');

  return [
    `https://www.${domain}`,  // Try with www first
    `https://${domain}`,      // Then without www
    `http://www.${domain}`,   // Then try http with www
    `http://${domain}`        // Finally http without www
  ];
}

/**
 * Extracts the base domain from a URL
 * @param url - The URL to extract from
 * @returns The base domain without protocol or www
 */
export function getBaseDomain(url: string): string {
  if (!url) {
    return '';
  }

  // Remove protocol and www
  return url.replace(/^(https?:\/\/)?(www\.)?/i, '')
    .split('/')[0] // Remove paths
    .toLowerCase();
}

/**
 * Sanitizes and validates a URL for safe usage
 * @param url - The URL to sanitize
 * @returns Sanitized URL or throws error if invalid
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    throw new Error('Invalid URL: must be a non-empty string');
  }

  // First check if URL is safe
  if (!isSafeUrl(url)) {
    throw new Error('Invalid URL: contains dangerous content');
  }

  // Decode if encoded
  let decodedUrl = url.trim();
  try {
    decodedUrl = decodeURIComponent(url.trim());
  } catch {
    // Use original if decode fails
  }

  // Use existing formatUrlForScan which handles cleaning
  const cleaned = formatUrlForScan(decodedUrl);

  // Final validation
  try {
    const urlObj = new URL(cleaned);
    
    // Only allow http and https
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error('Invalid URL: only HTTP(S) protocols are allowed');
    }

    // Reject localhost and internal IPs in production
    if (process.env.NODE_ENV === 'production') {
      const hostname = urlObj.hostname.toLowerCase();
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.')
      ) {
        throw new Error('Invalid URL: internal addresses not allowed');
      }
    }

    return cleaned;
  } catch (error: any) {
    if (error.message.startsWith('Invalid URL:')) {
      throw error;
    }
    throw new Error(`Invalid URL format: ${error.message}`);
  }
}

/**
 * Validates if a domain is safe for scanning
 * @param domain - The domain to validate
 * @returns true if valid, false otherwise
 */
export function isValidScanDomain(domain: string): boolean {
  try {
    const sanitized = sanitizeUrl(domain);
    const urlObj = new URL(sanitized);
    
    // Check domain length limits
    if (urlObj.hostname.length > 255) {
      return false;
    }
    
    // Check path length
    if (urlObj.pathname.length > 2048) {
      return false;
    }
    
    // Check for too many subdomains (possible attack)
    const parts = urlObj.hostname.split('.');
    if (parts.length > 5) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}
