import { parse, getDomain } from 'tldts';

interface RootDomainOptions {
  validHosts?: string[];
  allowPrivateDomains?: boolean;
}

export function isIpAddress(value: string): boolean {
  if (!value) return false;
  // Use tldts.parse to check for IP. It's more robust.
  // Pass extractHostname: false because 'value' is already a hostname/IP.
  // Pass validateHostname: false to prevent tldts from rejecting if it's just an IP string.
  const parsed = parse(value, { extractHostname: false, validateHostname: false });
  return parsed.isIp || false;
}

/**
 * Checks if a domain string has a structurally valid root domain format (e.g., example.com, example.co.uk).
 * This is typically used on the output of getRootDomain if it's not 'localhost' or an IP address.
 * @param domain The domain string to check.
 * @returns True if the format is valid, false otherwise.
 */
export function isValidRootDomainFormat(domain: string): boolean {
  const pattern = /^(?!-)[a-zA-Z0-9-]{1,63}(?<!-)(?:\.(?!-)[a-zA-Z0-9-]{1,63}(?<!-))*(?:\.(?!-)[a-zA-Z0-9-]{2,})$/i;
  return pattern.test(domain);
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
    return '';
  }

  let cleanedInput = urlOrHostname.replace(/^(https?:\/\/)?(www\.)?/, '');
  const parts = cleanedInput.split(/[\/?#]/);
  cleanedInput = parts[0];

  if (isIpAddress(cleanedInput)) {
    return cleanedInput;
  }

  if (cleanedInput.toLowerCase() === 'localhost') {
    return 'localhost';
  }

  const tldtsOptions = {
    validHosts: options?.validHosts || ['localhost'],
    allowPrivateDomains: options?.allowPrivateDomains || false,
  };

  try {
    const domainInfo = getDomain(urlOrHostname, tldtsOptions);

    if (domainInfo) {
      return domainInfo;
    }
    
    return cleanedInput; // Fallback to the cleaned input

  } catch (error) {
    console.error('Error parsing domain with tldts:', error);
    return cleanedInput; // Fallback in case of tldts error
  }
}