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
export function extractRootDomain(hostname: string): string {
  // Handle localhost and IP addresses
  if (hostname === 'localhost' || /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    return hostname;
  }

  // Remove port number if present
  hostname = hostname.replace(/:\d+$/, '');

  // Handle special cases for common country-specific TLDs
  const specialTlds = [
    'co.uk', 'com.au', 'co.nz', 'co.za', 'com.sg', 'com.br', 'com.mx',
    'com.tw', 'com.hk', 'com.my', 'com.ph', 'com.pk', 'com.pe', 'com.ve',
    'com.tr', 'com.eg', 'com.sa', 'com.ae', 'com.bd', 'com.bh', 'com.kw',
    'com.qa', 'com.om', 'com.lb', 'com.jo', 'com.ye', 'com.ng', 'com.gh',
    'com.ke', 'com.tz', 'com.ug', 'com.na', 'com.bw', 'com.zm', 'com.mw',
    'com.mu', 'com.sc', 'com.mv', 'com.bt', 'com.np', 'com.lk', 'com.mm',
    'com.kh', 'com.la', 'com.vn', 'com.id', 'com.my', 'com.sg', 'com.bn',
    'com.ph', 'com.pg', 'com.fj', 'com.to', 'com.ws', 'com.as', 'com.gu',
    'com.mp', 'com.pf', 'com.nc', 'com.vu', 'com.nr', 'com.ck', 'com.nu',
    'com.tk', 'com.wf', 'com.pn', 'com.sh', 'com.ac', 'com.gg', 'com.je',
    'com.im', 'com.ms', 'com.tc', 'com.vg', 'com.vi', 'com.ky', 'com.bm',
    'com.ai', 'com.ag', 'com.dm', 'com.gd', 'com.lc', 'com.vc', 'com.bb',
    'com.tt', 'com.jm', 'com.ht', 'com.do', 'com.pr', 'com.cu', 'com.bs',
    'com.tc', 'com.vg', 'com.vi', 'com.ky', 'com.bm', 'com.ai', 'com.ag',
    'com.dm', 'com.gd', 'com.lc', 'com.vc', 'com.bb', 'com.tt', 'com.jm',
    'com.ht', 'com.do', 'com.pr', 'com.cu', 'com.bs','com.pl'
  ];

  // Check for special TLDs first
  for (const tld of specialTlds) {
    if (hostname.endsWith(`.${tld}`)) {
      const parts = hostname.split('.');
      // Get the domain and the special TLD
      return parts.slice(-3).join('.');
    }
  }

  // For regular domains, split by dots and get the last two parts
  const parts = hostname.split('.');
  
  // Handle cases with multiple subdomains
  if (parts.length > 2) {
    // Return the last two parts (domain.tld)
    return parts.slice(-2).join('.');
  }

  // If we have exactly two parts or less, return as is
  return hostname;
}
