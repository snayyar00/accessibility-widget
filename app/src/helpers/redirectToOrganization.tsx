export function redirectToUserOrganization(domain: string): boolean {
  const protocol = window.location.protocol;
  const pathname = window.location.pathname;
  const search = window.location.search;

  const currentHost = window.location.host.toLowerCase();
  const newUrl = `${protocol}//${domain}${pathname}${search}`;

  if (currentHost !== domain) {
    window.location.href = newUrl;
    return true;
  }

  return false;
}
