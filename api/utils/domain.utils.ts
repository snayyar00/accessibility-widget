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
 * 
 * @example
 * formatUrlForScan('example.com') // 'https://www.example.com'
 * formatUrlForScan('https://example.com') // 'https://www.example.com'
 * formatUrlForScan('http://www.example.com/path') // 'https://www.example.com'
 * formatUrlForScan('subdomain.example.com') // 'https://www.subdomain.example.com'
 */
export function formatUrlForScan(url: string): string {
  if (!url) {
    return '';
  }

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
 * Normalizes domain by removing protocol and www prefix
 * @param url - URL to normalize
 * @returns Normalized domain without protocol and www
 * 
 * @example
 * normalizeDomain('https://www.example.com') // 'example.com'
 * normalizeDomain('http://example.com') // 'example.com'
 * normalizeDomain('www.example.com') // 'example.com'
 * normalizeDomain('example.com') // 'example.com'
 * normalizeDomain('https://subdomain.example.com/path/') // 'subdomain.example.com/path'
 */
export function normalizeDomain(url: string): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  return url
    .trim()
    .toLowerCase()
    .replace(/^(https?:\/\/)?(www\.)?/, '') // Remove protocol and www
    .replace(/\/$/, ''); // Remove trailing slash
}

/**
 * Extracts clean domain from any URL format
 * @param url - Any URL format (with/without protocol, with/without www, with paths, etc.)
 * @returns Clean domain name only
 * 
 * @example
 * extractDomain('https://www.example.com/path?query=1#hash') // 'example.com'
 * extractDomain('http://subdomain.example.com:3000/api/users') // 'subdomain.example.com'
 * extractDomain('www.example.com/about') // 'example.com'
 * extractDomain('example.com') // 'example.com'
 * extractDomain('ftp://files.example.com/file.zip') // 'files.example.com'
 */
export function extractDomain(url: string): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  let domain = url.trim().toLowerCase();

  // Remove any protocol (http://, https://, ftp://, etc.)
  domain = domain.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');

  // Remove www. prefix if present
  domain = domain.replace(/^www\./i, '');

  // Remove everything after the domain (paths, queries, hashes)
  domain = domain.split('/')[0];
  domain = domain.split('?')[0];
  domain = domain.split('#')[0];

  // Remove port number if present
  domain = domain.split(':')[0];

  // Clean any remaining invalid characters but keep dots and hyphens
  domain = domain.replace(/[^a-z0-9.-]/g, '');

  // Remove leading/trailing dots or hyphens
  domain = domain.replace(/^[.-]+|[.-]+$/g, '');

  return domain;
}