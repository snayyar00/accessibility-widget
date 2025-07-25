import { getAuthenticationCookie } from '@/utils/cookie';

type LogoSettings = {
  logoImage: string;
  logoUrl: string;
  accessibilityStatementLinkUrl: string;
};

const getWidgetSettings = async (siteUrl: string): Promise<LogoSettings> => {
  const fallbackLogoUrl = '/images/logo.png';
  const url = `${process.env.REACT_APP_BACKEND_URL}/get-site-widget-settings`;
  const bodyData = { site_url: siteUrl };
  const token = getAuthenticationCookie();

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(bodyData),
    });

    if (!response.ok) throw new Error('Network error');

    const data = await response.json();
    const settings =
      typeof data.settings === 'string'
        ? JSON.parse(data.settings)
        : data.settings;
    const logoImage = settings?.logoImage || fallbackLogoUrl;
    const logoUrl = settings?.logoUrl || '';
    const accessibilityStatementLinkUrl =
      settings?.accessibilityStatementLinkUrl || '';

    return {
      logoImage,
      logoUrl,
      accessibilityStatementLinkUrl,
    };
  } catch (err) {
    console.error('Failed to fetch logoUrl:', err);
    return {
      logoImage: fallbackLogoUrl,
      logoUrl: '',
      accessibilityStatementLinkUrl: '',
    };
  }
};

export default getWidgetSettings;
