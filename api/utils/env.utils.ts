import { normalizeDomain } from './domain.utils'

/**
 * Returns an array of URLs from a comma-separated env variable or a single value.
 * If the variable is undefined, returns an empty array.
 */
export function parseEnvUrls(envValue?: string): string[] {
  if (!envValue) return []

  return envValue
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean)
}

/**
 * Finds the best matching frontendUrl from the environment variable by comparing with currentDomain using normalizeDomain
 * @param currentDomain - client domain (may be without protocol)
 * @returns the best matching frontendUrl
 */
export function getMatchingFrontendUrl(currentDomain: string | null): string | null {
  const frontendUrls = parseEnvUrls(process.env.FRONTEND_URL)

  if (!frontendUrls.length) return null
  if (!currentDomain) return null

  const found = frontendUrls.find((url) => normalizeDomain(url) === normalizeDomain(currentDomain))

  return found || null
}
