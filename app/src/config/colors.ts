/**
 * Centralized Color Configuration
 *
 * This file contains all color definitions used across the application.
 * Update colors here to control the appearance of all components.
 *
 * Usage:
 * 1. For structured access with theme support: import { getColors } from '@/config/colors'
 *    const colors = getColors(); // or getColors(overrides)
 *    Use: colors.primary, colors.header.background, etc.
 *
 * 2. For direct access to base color variables: import { baseColors } from '@/config/colors'
 *    Use: baseColors.brandPrimary, baseColors.white, etc.
 *
 * Benefits of refactoring:
 * - Single source of truth for each unique color value
 * - Eliminates duplicate color definitions
 * - Easier to maintain and update brand colors
 * - Better consistency across the application
 */

// Base Color Variables - Single source of truth for each unique color
export const baseColors = {
  // Brand Colors
  brandPrimary: '#445AE7',
  brandPrimaryLight: '#7bb8d1',
  brandPrimaryDark: '#205A76',
  brandPrimaryHover: '#4682a0',
  brandNumbers: '#445AE7',

  // Blue Shades
  blueLight: '#e8f2fe',
  blueExtraLight: '#f4f7fc',
  blueTeal: '#8BAAD8',
  blueChart: '#36D1FF',
  blueGradientStart: '#6DBBBE',
  blueDivider: '#B4D8DA',
  blueTooltip: '#0B4B66',
  blueTooltipUser: '#117EA6',
  blueInfo: '#3b82f6',
  blueStats: '#ffffff',
  blueSection: '#e8ebfa',

  // Additional Blue Variants
  blueGradient1: '#235a75',
  blueGradient2: '#224452',
  blueTeal2: '#358E98',
  blueAccent: '#26627a',
  blueDark: '#1a4a5f',

  // Neutral Colors
  white: '#ffffff',
  black: '#000000',
  grayDark: '#333333',
  grayMedium: '#656565',
  grayLight: '#f8f9fa',
  grayLighter: '#e9ecef',
  grayBorder: '#dee2e6',
  grayText: '#434343',
  grayMuted: '#9ca3af',
  grayDark2: '#111827',
  grayPlaceholder: '#9ca3af',
  grayLabel: '#374151',
  grayInput: '#d1d5db',
  grayGrid: '#e5e7eb',
  grayCard: '#f3f4f6',
  grayIcon: '#CCCCCC',

  // Brown/Tan
  brownBorder: '#7b6f6f',

  // Card/Background Colors
  cardLight: '#F9FBFB',
  cardBorder: '#BED2DB',
  cardBorderScan: '#C5D9E0',
  cardBorderPurple: '#A2ADF3',

  // Status Colors
  success: '#22c55e',
  successHover: '#16a34a',
  successBackground: '#dcfce7',
  warning: '#f59e0c',
  warningBackground: '#fef3c7',
  error: '#ef4444',
  errorHover: '#dc2626',
  errorBackground: '#fee2e2',
  infoBackground: '#dbeafe',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',

  // Gradients
  welcomeBannerGradient: 'linear-gradient(135deg, #235a75 0%, #224452 100%)',
  statsCardGradient: 'linear-gradient(to bottom, #11163A, #445AE7)',
  chartGradient: 'url(#primaryGradient)',
} as const;

// Removed old ColorPalette interface - now using baseColors directly

// Removed defaultColors and getColors - now using baseColors directly

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

// Example usage of baseColors:
// import { baseColors } from '@/config/colors';
// const buttonStyle = { backgroundColor: baseColors.brandPrimary, color: baseColors.white };

// Export baseColors as the default export for easier importing
export default baseColors;
