const getLogoUrlOnly = async (siteUrl: string): Promise<string> => {
    const fallbackLogoUrl = '/images/logo.png';
    const url = `${process.env.REACT_APP_BACKEND_URL}/get-site-widget-settings`;
    const bodyData = { site_url: siteUrl };
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Network error');

      const data = await response.json();
      // Accept both stringified and object settings
      const settings = typeof data.settings === 'string' ? JSON.parse(data.settings) : data.settings;
      // Extract logoImage (base64 or url) from settings
      const logoImage = settings?.logoImage;
      return logoImage || fallbackLogoUrl;
 
    } catch (err) {
      console.error('Failed to fetch logoUrl:', err);
      return fallbackLogoUrl;
    }
};

export default getLogoUrlOnly;