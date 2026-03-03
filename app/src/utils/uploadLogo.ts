import { getAuthenticationCookie } from './cookie';

export interface UploadLogoResponse {
  success: boolean;
  logoUrl?: string;
  iconUrl?: string;
  message?: string;
  error?: string;
}

/**
 * Upload widget logo to R2 storage
 * @param file - The image file to upload
 * @param siteUrl - The site URL for the widget
 * @returns Promise<UploadLogoResponse>
 */
export const uploadWidgetLogo = async (
  file: File,
  siteUrl: string
): Promise<UploadLogoResponse> => {
  try {
    const formData = new FormData();
    formData.append('logo', file);
    formData.append('site_url', siteUrl);

    const token = getAuthenticationCookie();
    const response = await fetch(
      `${process.env.REACT_APP_BACKEND_URL}/upload-logo`,
      {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to upload logo',
      };
    }

    return {
      success: true,
      logoUrl: data.logoUrl,
      message: data.message,
    };
  } catch (error) {
    console.error('Error uploading logo:', error);
    return {
      success: false,
      error: 'Network error occurred while uploading logo',
    };
  }
};

/**
 * Upload widget launcher icon (SVG) to R2 storage
 * @param file - The SVG file to upload
 * @param siteUrl - The site URL for the widget
 * @returns Promise<UploadLogoResponse>
 */
export const uploadWidgetIcon = async (
  file: File,
  siteUrl: string
): Promise<UploadLogoResponse> => {
  try {
    const formData = new FormData();
    formData.append('icon', file);
    formData.append('site_url', siteUrl);

    const token = getAuthenticationCookie();
    const response = await fetch(
      `${process.env.REACT_APP_BACKEND_URL}/upload-widget-icon`,
      {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to upload widget icon',
      };
    }

    return {
      success: true,
      iconUrl: data.iconUrl,
      message: data.message,
    };
  } catch (error) {
    console.error('Error uploading widget icon:', error);
    return {
      success: false,
      error: 'Network error occurred while uploading widget icon',
    };
  }
};

/**
 * Delete widget launcher icon from R2 storage
 * @param iconUrl - The URL of the icon to delete
 * @param siteUrl - The site URL for the widget
 * @returns Promise<UploadLogoResponse>
 */
export const deleteWidgetIcon = async (
  iconUrl: string,
  siteUrl: string
): Promise<UploadLogoResponse> => {
  try {
    const token = getAuthenticationCookie();
    const response = await fetch(
      `${process.env.REACT_APP_BACKEND_URL}/delete-widget-icon`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          icon_url: iconUrl,
          site_url: siteUrl,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to delete widget icon',
      };
    }

    return {
      success: true,
      message: data.message,
    };
  } catch (error) {
    console.error('Error deleting widget icon:', error);
    return {
      success: false,
      error: 'Network error occurred while deleting widget icon',
    };
  }
};

/**
 * Delete widget logo from R2 storage
 * @param logoUrl - The URL of the logo to delete
 * @param siteUrl - The site URL for the widget
 * @returns Promise<UploadLogoResponse>
 */
export const deleteWidgetLogo = async (
  logoUrl: string,
  siteUrl: string
): Promise<UploadLogoResponse> => {
  try {
    const token = getAuthenticationCookie();
    const response = await fetch(
      `${process.env.REACT_APP_BACKEND_URL}/delete-logo`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          logo_url: logoUrl,
          site_url: siteUrl,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to delete logo',
      };
    }

    return {
      success: true,
      message: data.message,
    };
  } catch (error) {
    console.error('Error deleting logo:', error);
    return {
      success: false,
      error: 'Network error occurred while deleting logo',
    };
  }
};
