export default function isValidDomain(domain: string): boolean {
  // Regex for a domain that has already been processed to be a root domain (no protocol, no www initially expected)
  // Checks for valid characters, label lengths, hyphen placement, and a TLD of at least 2 chars.
  const pattern =
    /^(?!-)[a-zA-Z0-9-]{1,63}(?<!-)(?:\.(?!-)[a-zA-Z0-9-]{1,63}(?<!-))*(?:\.(?!-)[a-zA-Z0-9-]{2,})$/i;
  return pattern.test(domain);
}
