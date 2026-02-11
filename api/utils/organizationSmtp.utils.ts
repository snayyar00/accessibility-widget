import { generateOrganizationLogoUrl } from '../helpers/imgproxy.helper'
import { getOrganizationById } from '../repository/organization.repository'

/**
 * Per-organization SMTP config (e.g. Hostinger).
 * When set, emails for that org are sent via this SMTP instead of Brevo.
 * Fields: SMTP server (host), port, encryption (SSL/TLS), username (full email), password.
 */
export type OrganizationSmtpConfig = {
  host: string
  port: number
  secure: boolean
  user: string
  password: string
  fromName?: string
  /** Organization display name for sender (e.g. "Acme Corp" instead of "WebAbility") */
  organizationName?: string
  /** Full URL for organization logo (for email templates); only set when org has logo_url */
  logoUrl?: string
}

const DEFAULT_HOST = 'smtp.hostinger.com'
const DEFAULT_PORT = 465
const DEFAULT_SECURE = true

function parseSettings(settings: string | object | null | undefined): Record<string, unknown> | null {
  if (settings == null) return null
  if (typeof settings === 'object') return settings as Record<string, unknown>
  try {
    return JSON.parse(settings) as Record<string, unknown>
  } catch {
    return null
  }
}

/** Config when org has SMTP credentials; org name is always included when org exists */
export type OrganizationEmailContext = OrganizationSmtpConfig | { organizationName: string; logoUrl?: string }

/**
 * Returns SMTP config for an organization (when credentials exist), or at least organization name for sender display.
 * Prefers dedicated columns (smtp_user, smtp_password, etc.); falls back to settings.smtp if columns not set.
 * When org exists but has no SMTP, returns { organizationName } so emails still use org name instead of "WebAbility".
 */
export async function getOrganizationSmtpConfig(organizationId: number): Promise<OrganizationEmailContext | null> {
  const org = await getOrganizationById(organizationId)
  if (!org) return null

  const organizationName = typeof org.name === 'string' && org.name.trim() ? org.name.trim() : undefined
  if (!organizationName) return null

  const orgWithLogo = org as { logo_url?: string | null }
  const logoUrl =
    typeof orgWithLogo.logo_url === 'string' && orgWithLogo.logo_url.trim()
      ? generateOrganizationLogoUrl(orgWithLogo.logo_url.trim())
      : undefined

  const o = org as {
    smtp_user?: string | null
    smtp_password?: string | null
    smtp_host?: string | null
    smtp_port?: number | null
    smtp_secure?: boolean | null
  }

  // Prefer dedicated columns (host, port, SSL/TLS, username, password)
  if (
    typeof o.smtp_user === 'string' &&
    o.smtp_user.trim() &&
    typeof o.smtp_password === 'string' &&
    o.smtp_password
  ) {
    const port =
      typeof o.smtp_port === 'number' && o.smtp_port > 0
        ? o.smtp_port
        : typeof o.smtp_port === 'string'
          ? parseInt(o.smtp_port, 10)
          : DEFAULT_PORT
    const portNum = Number.isFinite(port) && port > 0 ? port : DEFAULT_PORT
    const host =
      typeof o.smtp_host === 'string' && o.smtp_host.trim()
        ? o.smtp_host.trim()
        : DEFAULT_HOST
    return {
      host,
      port: portNum,
      secure: typeof o.smtp_secure === 'boolean' ? o.smtp_secure : portNum === 465,
      user: o.smtp_user.trim(),
      password: o.smtp_password,
      organizationName,
      logoUrl,
    }
  }

  // Fallback: settings.smtp
  const raw = parseSettings(org.settings)
  const smtp = raw?.smtp as Record<string, unknown> | undefined
  if (smtp && typeof smtp === 'object') {
    const user = smtp.user
    const password = smtp.password
    if (typeof user === 'string' && user.trim() && typeof password === 'string' && password) {
      const port =
        typeof smtp.port === 'number' && smtp.port > 0
          ? smtp.port
          : typeof smtp.port === 'string'
            ? parseInt(smtp.port as string, 10)
            : DEFAULT_PORT
      const portNum = Number.isFinite(port) && port > 0 ? port : DEFAULT_PORT
      const host =
        typeof smtp.host === 'string' && (smtp.host as string).trim()
          ? (smtp.host as string).trim()
          : DEFAULT_HOST
      return {
        host,
        port: portNum,
        secure: typeof smtp.secure === 'boolean' ? smtp.secure : portNum === 465,
        user: user.trim(),
        password,
        organizationName,
        logoUrl,
      }
    }
  }

  // Org exists but no SMTP credentials: still return org name and logo for sender display
  return { organizationName, logoUrl }
}
