export function redirectToOrganization(org: { subdomain?: string } | null | undefined, baseDomain: string, pathname: string, search: string) {
  const defaultSubdomainMatch = baseDomain.match(/^https?:\/\/([^.]+)\./);
  const defaultSubdomain = defaultSubdomainMatch ? defaultSubdomainMatch[1] : 'app';

  const currentHost = window.location.hostname;
  const currentPort = window.location.port;

  if (org) {
    const orgSubdomain = org.subdomain || defaultSubdomain;

    const domainMatch = baseDomain.match(/^https?:\/\/(?:[^.]+\.)?([^:/]+(?:\.[^:/]+)*)(?::\d+)?/);
    const domain = domainMatch ? domainMatch[1] : currentHost;

    const expectedHost = `${orgSubdomain}.${domain}`;

    if (currentHost !== expectedHost) {
      const portPart = currentPort ? `:${currentPort}` : '';
      const newUrl = `${window.location.protocol}//${expectedHost}${portPart}${pathname}${search}`;

      window.location.href = newUrl;

      return true;
    }
  } else {
    const url = baseDomain.replace(/\/$/, '') + pathname + search;

    if (window.location.href !== url) {
      window.location.href = url;
      
      return true;
    }
  }

  return false;
}
