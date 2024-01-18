export default function isValidDomain(domain: string): boolean {
  const pattern = /^(https?:\/\/)?(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z0-9-]{1,63})*(\.[A-Za-z]{2,6})$/;
  return pattern.test(domain);
}