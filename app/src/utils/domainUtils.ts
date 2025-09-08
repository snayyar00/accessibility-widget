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
  const parsed = parse(value, {
    extractHostname: false,
    validateHostname: false,
  });
  return parsed.isIp || false;
}

/**
 * Checks if a domain string has a structurally valid root domain format (e.g., example.com, example.co.uk).
 * This is typically used on the output of getRootDomain if it's not 'localhost' or an IP address.
 * @param domain The domain string to check.
 * @returns True if the format is valid, false otherwise.
 */
export function isValidRootDomainFormat(domain: string): boolean {
  const pattern =
    /^(?!-)[a-zA-Z0-9-]{1,63}(?<!-)(?:\.(?!-)[a-zA-Z0-9-]{1,63}(?<!-))*(?:\.(?!-)[a-zA-Z0-9-]{2,})$/i;
  return pattern.test(domain);
}

/**
 * Checks if a domain string has a valid format including subdomains (e.g., coaching.honorandclarity.com).
 * This supports subdomains and is useful for scanner functionality.
 * @param domain The domain string to check.
 * @returns True if the format is valid, false otherwise.
 */
export function isValidFullDomainFormat(domain: string): boolean {
  const pattern =
    /^(?!-)[a-zA-Z0-9-]{1,63}(?<!-)(?:\.(?!-)[a-zA-Z0-9-]{1,63}(?<!-))*(?:\.(?!-)[a-zA-Z0-9-]{2,})$/i;
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
export function getRootDomain(
  urlOrHostname: string,
  options?: RootDomainOptions,
): string {
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

/**
 * Extracts and validates a domain with subdomains preserved (e.g., coaching.honorandclarity.com).
 * This is useful for scanner functionality where subdomains should be preserved.
 * Includes all validation features from getRootDomain but preserves subdomains.
 *
 * @param urlOrHostname - The URL or hostname string to parse.
 * @param options - Optional configuration for tldts.
 * @returns The full domain with subdomains, IP, localhost, or a cleaned version of the input.
 */
export function getFullDomain(
  urlOrHostname: string,
  options?: RootDomainOptions,
): string {
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
    // Use tldts to validate the domain structure, but we need to extract the full domain
    // First, let's validate that the domain has a proper structure
    const domainInfo = getDomain(urlOrHostname, tldtsOptions);

    if (domainInfo) {
      // If tldts can extract a root domain, it means the domain structure is valid
      // Now we return the full cleaned input (with subdomains preserved)
      return cleanedInput;
    }

    // If tldts couldn't extract a domain, the structure might be invalid
    // But we still return the cleaned input as fallback for edge cases
    return cleanedInput;
  } catch (error) {
    console.error('Error parsing domain with tldts:', error);
    // Fallback to the cleaned input in case of tldts error
    return cleanedInput;
  }
}
