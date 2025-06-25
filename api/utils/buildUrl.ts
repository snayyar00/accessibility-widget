export function buildFrontendAppUrl(subdomain?: string): string {
  const frontendUrl = process.env.FRONTEND_URL || '';

  try {
    const url = new URL(frontendUrl);
    const hostParts = url.hostname.split('.');
    
    if (subdomain) {
      hostParts[0] = subdomain;
      url.hostname = hostParts.join('.');
    }

    return url.toString();
  } catch {
    return frontendUrl;
  }
}
