type LogoSettings = {
  logoImage: string;
  logoUrl: string;
  accessibilityStatementLinkUrl: string;
};
import { findSiteByURL } from '../../api/repository/sites_allowed.repository';
import { getWidgetSettingsBySiteId } from '../../api/repository/widget_settings.repository';

const getWidgetSettings = async (
  siteUrl: string
): Promise<LogoSettings> => {
  const fallbackLogoUrl = '/images/logo.png';
  try {
    const site = await findSiteByURL(siteUrl);
    if (!site) {
      // Site not found, return fallback
      return {
        logoImage: fallbackLogoUrl,
        logoUrl: '',
        accessibilityStatementLinkUrl: '',
      };
    }
    // Get widget settings by site ID
    const widgetSettings = await getWidgetSettingsBySiteId(site.id);
    const settings = widgetSettings?.settings
      ? typeof widgetSettings.settings === 'string'
        ? JSON.parse(widgetSettings.settings)
        : widgetSettings.settings
      : {};
    const logoImage = settings?.logoImage || fallbackLogoUrl;
    const logoUrl = settings?.logoUrl || '';
    const accessibilityStatementLinkUrl = settings?.accessibilityStatementLinkUrl || '';

    return {
      logoImage,
      logoUrl,
      accessibilityStatementLinkUrl,
    };
  } catch (err) {
    console.error('Failed to fetch widget settings:', err);
    return {
      logoImage: fallbackLogoUrl,
      logoUrl: '',
      accessibilityStatementLinkUrl: '',
    };
  }
};

export default getWidgetSettings;
