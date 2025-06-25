export function redirectToDefaultSubdomain(baseDomain: string, pathname: string, search: string) {
  const defaultSubdomainMatch = baseDomain.match(/^https?:\/\/([^.]+)\./);
  const defaultSubdomain = defaultSubdomainMatch ? defaultSubdomainMatch[1] : 'app';

  const currentHost = window.location.hostname;
  const currentPort = window.location.port;

  const domainMatch = baseDomain.match(/^https?:\/\/(?:[^.]+\.)?([^:/]+(?:\.[^:/]+)*)(?::\d+)?/);
  const domain = domainMatch ? domainMatch[1] : currentHost;

  const expectedHost = `${defaultSubdomain}.${domain}`;

  if (currentHost !== expectedHost) {
    const portPart = currentPort ? `:${currentPort}` : '';
    const newUrl = `${window.location.protocol}//${expectedHost}${portPart}${pathname}${search}`;

    window.location.href = newUrl;

    return true;
  }

  return false;
}
