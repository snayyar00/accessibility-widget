/**
 * Utility functions for handling domain names and URLs
 */

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
  const cleanUrl = cleanDomain(url);
  const variations: string[] = [];

  // First try with www
  if (!cleanUrl.includes('//www.')) {
    variations.push(cleanUrl.replace('https://', 'https://www.'));
  }

  // Then try without www
  variations.push(cleanUrl.replace('//www.', '//'));

  return variations;
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
