/**
 * Centralized Color Configuration
 *
 * This file contains all color definitions used across the application.
 * Update colors here to control the appearance of all components.
 */

export interface ColorPalette {
  // Primary Brand Colors
  primary: string;
  primaryLight: string;
  primaryDark: string;

  // Header/Navigation Colors
  header: {
    background: string;
    logoColor: string;
    logoSecondary: string;
    textColor: string;
    iconColor: string;
    avatarBorder: string;
    dropdownBackground: string;
    dropdownText: string;
    dropdownHover: string;
  };

  // Sidebar Colors
  sidebar: {
    background: string;
    cardBackground: string;
    activeItemBackground: string;
    activeItemText: string;
    inactiveItemText: string;
    iconColor: string;
    activeIconColor: string;
    hoverBackground: string;
    addButtonBackground: string;
    addButtonText: string;
    addButtonIcon: string;
  };

  // Dashboard Colors
  dashboard: {
    background: string;
    cardBackground: string;
    cardBorder: string;
    welcomeBannerBackground: string;
    welcomeBannerText: string;
    chartPrimary: string;
    chartSecondary: string;
    metricCardBackground: string;
    metricCardText: string;
    metricCardValue: string;
    // Analytics specific colors
    analyticsCardBackground: string;
    analyticsCardBorder: string;
    analyticsDivider: string;
    analyticsSelectBackground: string;
    analyticsSelectText: string;
    analyticsIconColor: string;
    chartStroke: string;
    chartFill: string;
    chartGradientStart: string;
    chartGradientEnd: string;
    chartGridColor: string;
    chartAxisColor: string;
    chartTooltipBackground: string;
    chartTooltipUserIcon: string;
    chartActiveDot: string;
    showMoreButtonBackground: string;
    showMoreButtonText: string;
  };

  // Installation Page Colors
  installation: {
    pageBackground: string;
    sectionBackground: string;
    cardBackground: string;
    cardBorder: string;
    buttonBackground: string;
    buttonText: string;
    buttonHover: string;
    linkColor: string;
    linkHover: string;
    statsCardBackground: string;
    statsCardGradientFrom: string;
    statsCardGradientTo: string;
    statsCardText: string;
    statsCardAccent: string;
    iconColor: string;
  };

  // Common Component Colors
  buttons: {
    primary: {
      background: string;
      text: string;
      hover: string;
      border: string;
    };
    secondary: {
      background: string;
      text: string;
      hover: string;
      border: string;
    };
    success: {
      background: string;
      text: string;
      hover: string;
    };
    danger: {
      background: string;
      text: string;
      hover: string;
    };
  };

  // Form Elements
  forms: {
    inputBackground: string;
    inputBorder: string;
    inputText: string;
    inputPlaceholder: string;
    inputFocus: string;
    labelColor: string;
  };

  // Status Colors
  status: {
    success: string;
    warning: string;
    error: string;
    info: string;
    successBackground: string;
    warningBackground: string;
    errorBackground: string;
    infoBackground: string;
  };

  // Text Colors
  text: {
    primary: string;
    secondary: string;
    muted: string;
    inverse: string;
  };

  // Background Colors
  backgrounds: {
    body: string;
    card: string;
    cardLight: string;
    modal: string;
    overlay: string;
    iconContainer: string;
  };

  // Border Colors
  borders: {
    light: string;
    medium: string;
    dark: string;
    card: string;
    scanHistory: string;
  };

  // Line Colors
  lines: {
    light: string;
  };
}

// Default Color Palette
export const defaultColors: ColorPalette = {
  // Primary Brand Colors
  primary: '#559EC1',
  primaryLight: '#7bb8d1',
  primaryDark: '#205A76',

  // Header/Navigation Colors
  header: {
    background: '#e4ebfc',
    logoColor: '#559EC1',
    logoSecondary: '#205A76',
    textColor: '#333333',
    iconColor: '#656565',
    avatarBorder: '#559EC1',
    dropdownBackground: '#ffffff',
    dropdownText: '#333333',
    dropdownHover: '#f8f9fa',
  },

  // Sidebar Colors
  sidebar: {
    background: '#e4ebfc',
    cardBackground: '#ffffff',
    activeItemBackground: '#e4ebfc',
    activeItemText: '#559EC1',
    inactiveItemText: '#656565',
    iconColor: '#656565',
    activeIconColor: '#559EC1',
    hoverBackground: '#f8f9fa',
    addButtonBackground: '#000000',
    addButtonText: '#ffffff',
    addButtonIcon: '#559EC1',
  },

  // Dashboard Colors
  dashboard: {
    background: '#e4ebfc',
    cardBackground: '#f4f7fc',
    cardBorder: '#7b6f6f',
    welcomeBannerBackground:
      'linear-gradient(135deg, #235a75 0%, #224452 100%)',
    welcomeBannerText: '#ffffff',
    chartPrimary: '#8BAAD8',
    chartSecondary: '#559EC1',
    metricCardBackground: '#ffffff',
    metricCardText: '#6b7280',
    metricCardValue: '#8BAAD8',
    // Analytics specific colors
    analyticsCardBackground: '#ffffff',
    analyticsCardBorder: '#f3f4f6',
    analyticsDivider: '#B4D8DA',
    analyticsSelectBackground: '#559EC1',
    analyticsSelectText: '#ffffff',
    analyticsIconColor: '#559EC1',
    chartStroke: '#36D1FF',
    chartFill: 'url(#primaryGradient)',
    chartGradientStart: '#6DBBBE',
    chartGradientEnd: '#6DBBBE',
    chartGridColor: '#e5e7eb',
    chartAxisColor: '#6b7280',
    chartTooltipBackground: '#0B4B66',
    chartTooltipUserIcon: '#117EA6',
    chartActiveDot: '#0B4B66',
    showMoreButtonBackground: '#559EC1',
    showMoreButtonText: '#ffffff',
  },

  // Installation Page Colors
  installation: {
    pageBackground: '#ffffff',
    sectionBackground: '#e8ebfa',
    cardBackground: '#ffffff',
    cardBorder: '#e5e7eb',
    buttonBackground: '#559EC1',
    buttonText: '#ffffff',
    buttonHover: '#4682a0',
    linkColor: '#205A76',
    linkHover: '#1a4a5f',
    statsCardBackground: 'linear-gradient(to bottom, #205A76, #358E98)',
    statsCardGradientFrom: '#205A76',
    statsCardGradientTo: '#358E98',
    statsCardText: '#99DCFB',
    statsCardAccent: '#26627a',
    iconColor: '#205A76',
  },

  // Common Component Colors
  buttons: {
    primary: {
      background: '#559EC1',
      text: '#ffffff',
      hover: '#4682a0',
      border: '#559EC1',
    },
    secondary: {
      background: '#f8f9fa',
      text: '#656565',
      hover: '#e9ecef',
      border: '#dee2e6',
    },
    success: {
      background: '#22c55e',
      text: '#ffffff',
      hover: '#16a34a',
    },
    danger: {
      background: '#ef4444',
      text: '#ffffff',
      hover: '#dc2626',
    },
  },

  // Form Elements
  forms: {
    inputBackground: '#ffffff',
    inputBorder: '#d1d5db',
    inputText: '#333333',
    inputPlaceholder: '#9ca3af',
    inputFocus: '#559EC1',
    labelColor: '#374151',
  },

  // Status Colors
  status: {
    success: '#22c55e',
    warning: '#f59e0c',
    error: '#ef4444',
    info: '#3b82f6',
    successBackground: '#dcfce7',
    warningBackground: '#fef3c7',
    errorBackground: '#fee2e2',
    infoBackground: '#dbeafe',
  },

  // Text Colors
  text: {
    primary: '#111827',
    secondary: '#6b7280',
    muted: '#9ca3af',
    inverse: '#ffffff',
  },

  // Background Colors
  backgrounds: {
    body: '#e4ebfc',
    card: '#ffffff',
    cardLight: '#F9FBFB',
    modal: '#ffffff',
    overlay: 'rgba(0, 0, 0, 0.5)',
    iconContainer: '#CCCCCC',
  },

  // Border Colors
  borders: {
    light: '#f3f4f6',
    medium: '#d1d5db',
    dark: '#9ca3af',
    card: '#BED2DB',
    scanHistory: '#C5D9E0',
  },

  // Line Colors
  lines: {
    light: '#BED2DB',
  },
};

// Export a function to get colors with optional overrides
export const getColors = (overrides?: Partial<ColorPalette>): ColorPalette => {
  if (!overrides) return defaultColors;

  return {
    ...defaultColors,
    ...overrides,
    header: { ...defaultColors.header, ...overrides.header },
    sidebar: { ...defaultColors.sidebar, ...overrides.sidebar },
    dashboard: { ...defaultColors.dashboard, ...overrides.dashboard },
    installation: { ...defaultColors.installation, ...overrides.installation },
    buttons: {
      primary: {
        ...defaultColors.buttons.primary,
        ...overrides.buttons?.primary,
      },
      secondary: {
        ...defaultColors.buttons.secondary,
        ...overrides.buttons?.secondary,
      },
      success: {
        ...defaultColors.buttons.success,
        ...overrides.buttons?.success,
      },
      danger: { ...defaultColors.buttons.danger, ...overrides.buttons?.danger },
    },
    forms: { ...defaultColors.forms, ...overrides.forms },
    status: { ...defaultColors.status, ...overrides.status },
    text: { ...defaultColors.text, ...overrides.text },
    backgrounds: { ...defaultColors.backgrounds, ...overrides.backgrounds },
    borders: { ...defaultColors.borders, ...overrides.borders },
  };
};

// Color utility functions
export const colorUtils = {
  /**
   * Convert hex to RGB
   */
  hexToRgb: (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  },

  /**
   * Add alpha to hex color
   */
  hexWithAlpha: (hex: string, alpha: number): string => {
    const rgb = colorUtils.hexToRgb(hex);
    if (!rgb) return hex;
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  },

  /**
   * Lighten a hex color
   */
  lighten: (hex: string, percent: number): string => {
    const rgb = colorUtils.hexToRgb(hex);
    if (!rgb) return hex;

    const factor = 1 + percent / 100;
    const r = Math.min(255, Math.round(rgb.r * factor));
    const g = Math.min(255, Math.round(rgb.g * factor));
    const b = Math.min(255, Math.round(rgb.b * factor));

    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  },

  /**
   * Darken a hex color
   */
  darken: (hex: string, percent: number): string => {
    const rgb = colorUtils.hexToRgb(hex);
    if (!rgb) return hex;

    const factor = 1 - percent / 100;
    const r = Math.max(0, Math.round(rgb.r * factor));
    const g = Math.max(0, Math.round(rgb.g * factor));
    const b = Math.max(0, Math.round(rgb.b * factor));

    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  },
};

export default getColors;
