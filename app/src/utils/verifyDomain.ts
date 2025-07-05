interface DomainValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateDomainWithDetails(domain: string): DomainValidationResult {
  if (!domain || typeof domain !== 'string') {
    return { isValid: false, error: 'Domain cannot be empty' };
  }

  // Strip protocol and trailing slash if present
  let cleanDomain = domain.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
  
  // Remove www. prefix if present
  cleanDomain = cleanDomain.replace(/^www\./, '');

  if (!cleanDomain) {
    return { isValid: false, error: 'Domain cannot be empty after cleaning' };
  }

  // Check for invalid characters
  if (!/^[a-zA-Z0-9.-]+$/.test(cleanDomain)) {
    return { isValid: false, error: 'Domain contains invalid characters (only letters, numbers, dots, and hyphens allowed)' };
  }

  // Check for consecutive dots
  if (/\.\./.test(cleanDomain)) {
    return { isValid: false, error: 'Domain cannot contain consecutive dots (..)' };
  }

  // Check if starts or ends with dot
  if (cleanDomain.startsWith('.') || cleanDomain.endsWith('.')) {
    return { isValid: false, error: 'Domain cannot start or end with a dot' };
  }

  // Check if starts or ends with hyphen
  if (cleanDomain.startsWith('-') || cleanDomain.endsWith('-')) {
    return { isValid: false, error: 'Domain cannot start or end with a hyphen' };
  }

  // Split into parts and validate each part
  const parts = cleanDomain.split('.');
  
  if (parts.length < 2) {
    return { isValid: false, error: 'Domain must contain at least one dot (e.g., example.com)' };
  }

  // Check TLD (last part)
  const tld = parts[parts.length - 1];
  if (tld.length < 2) {
    return { isValid: false, error: 'Top-level domain (TLD) must be at least 2 characters long' };
  }

  if (!/^[a-zA-Z]+$/.test(tld)) {
    return { isValid: false, error: 'Top-level domain (TLD) can only contain letters' };
  }

  // Check each part
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    
    if (!part) {
      return { isValid: false, error: 'Domain parts cannot be empty' };
    }
    
    if (part.length > 63) {
      return { isValid: false, error: 'Domain parts cannot be longer than 63 characters' };
    }
    
    if (part.startsWith('-') || part.endsWith('-')) {
      return { isValid: false, error: 'Domain parts cannot start or end with hyphens' };
    }
  }

  // Final regex check for complete validation
  const pattern = /^(?!-)[a-zA-Z0-9-]{1,63}(?<!-)(?:\.(?!-)[a-zA-Z0-9-]{1,63}(?<!-))*(?:\.(?!-)[a-zA-Z0-9-]{2,})$/i;
  if (!pattern.test(cleanDomain)) {
    return { isValid: false, error: 'Domain format is invalid' };
  }

  return { isValid: true };
}

// Keep the original function for backward compatibility
export default function isValidDomain(domain: string): boolean {
  return validateDomainWithDetails(domain).isValid;
}