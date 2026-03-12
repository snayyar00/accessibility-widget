import { findSiteByURL } from '../repository/sites_allowed.repository'
import { getWidgetSettingsBySiteId } from '../repository/widget_settings.repository'
import { normalizeDomain } from './domain.utils'

type LogoSettings = {
  logoImage: string
  logoUrl: string
  accessibilityStatementLinkUrl: string
  termsAndConditionsLink: string
}

const getWidgetSettings = async (siteUrl: string): Promise<LogoSettings> => {
  const fallbackLogoUrl = '/images/logo.png'
  try {
    // Normalize URL so lookup matches DB (sites are stored with normalized domain, e.g. "paklap.pk")
    const normalizedUrl = normalizeDomain(siteUrl || '')
    const site = await findSiteByURL(normalizedUrl)
    if (!site) {
      // Site not found, return fallback
      return {
        logoImage: fallbackLogoUrl,
        logoUrl: '',
        accessibilityStatementLinkUrl: '',
        termsAndConditionsLink: 'https://www.webability.io/terms-of-use',
      }
    }
    // Get widget settings by site ID
    const widgetSettings = await getWidgetSettingsBySiteId(site.id)
    const settings = widgetSettings?.settings ? (typeof widgetSettings.settings === 'string' ? JSON.parse(widgetSettings.settings) : widgetSettings.settings) : {}
    const logoImage = settings?.logoImage || fallbackLogoUrl
    const logoUrl = settings?.logoUrl || ''
    const accessibilityStatementLinkUrl = settings?.accessibilityStatementLinkUrl || ''
    const termsAndConditionsLink = settings?.termsAndConditionsLink || 'https://www.webability.io/terms-of-use'

    return {
      logoImage,
      logoUrl,
      accessibilityStatementLinkUrl,
      termsAndConditionsLink,
    }
  } catch (err) {
    console.error('Failed to fetch widget settings:', err)
    return {
      logoImage: fallbackLogoUrl,
      logoUrl: '',
      accessibilityStatementLinkUrl: '',
      termsAndConditionsLink: 'https://www.webability.io/terms-of-use',
    }
  }
}

export default getWidgetSettings
