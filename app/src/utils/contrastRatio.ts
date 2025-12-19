/**
 * WCAG Contrast Ratio Utilities
 * 
 * Provides functions to calculate contrast ratios between colors
 * and check compliance with WCAG 2.1 accessibility standards.
 * Based on the webAbilityFrontend implementation.
 * 
 * WCAG Requirements:
 * - Level AA: Normal text requires 4.5:1, Large text requires 3:1
 * - Level AAA: Normal text requires 7:1, Large text requires 4.5:1
 */

export interface WCAG2Rating {
  aa: {
    normal: boolean;
    large: boolean;
  };
  aaa: {
    normal: boolean;
    large: boolean;
  };
}

export interface ContrastResult {
  ratio: number;
  passesAA: boolean;
  passesAAA: boolean;
  passesAALarge: boolean;
  passesAAALarge: boolean;
  level: 'AA' | 'AAA' | 'FAIL';
  levelLarge: 'AA' | 'AAA' | 'FAIL';
  rating: WCAG2Rating;
}

/**
 * Converts hex color to RGB values
 * Matches webAbilityFrontend implementation
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  let hexClean = hex.replace(/^#/, '');
  if (hexClean.length === 3) {
    hexClean = hexClean.split('').map((c) => c + c).join('');
  }
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexClean);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculate relative luminance for WCAG 2.1
 * Matches webAbilityFrontend implementation
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate WCAG 2.1 contrast ratio
 * Matches webAbilityFrontend calculateWCAG2Contrast implementation
 */
export function calculateWCAG2Contrast(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return 0;

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);

  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Get WCAG 2.1 rating
 * Matches webAbilityFrontend getWCAG2Rating implementation
 */
export function getWCAG2Rating(contrast: number): WCAG2Rating {
  return {
    aa: {
      normal: contrast >= 4.5,
      large: contrast >= 3,
    },
    aaa: {
      normal: contrast >= 7,
      large: contrast >= 4.5,
    },
  };
}

/**
 * Calculates contrast ratio between two colors
 * Formula: (L1 + 0.05) / (L2 + 0.05)
 * Where L1 is the lighter color and L2 is the darker color
 * Legacy function for backward compatibility
 */
export function getContrastRatio(
  color1: string,
  color2: string,
): number | null {
  const ratio = calculateWCAG2Contrast(color1, color2);
  return ratio > 0 ? Math.round(ratio * 100) / 100 : null;
}

/**
 * Checks WCAG compliance for a contrast ratio
 * Returns detailed compliance information with webAbilityFrontend-compatible structure
 */
export function checkWCAGCompliance(ratio: number | null): ContrastResult {
  if (ratio === null || ratio === 0) {
    const rating = {
      aa: { normal: false, large: false },
      aaa: { normal: false, large: false },
    };
    return {
      ratio: 0,
      passesAA: false,
      passesAAA: false,
      passesAALarge: false,
      passesAAALarge: false,
      level: 'FAIL',
      levelLarge: 'FAIL',
      rating,
    };
  }

  // Get rating using webAbilityFrontend-compatible structure
  const rating = getWCAG2Rating(ratio);

  // WCAG 2.1 Level AA: 4.5:1 for normal text, 3:1 for large text
  // WCAG 2.1 Level AAA: 7:1 for normal text, 4.5:1 for large text
  const passesAA = rating.aa.normal;
  const passesAAA = rating.aaa.normal;
  const passesAALarge = rating.aa.large;
  const passesAAALarge = rating.aaa.large;

  return {
    ratio,
    passesAA,
    passesAAA,
    passesAALarge,
    passesAAALarge,
    level: passesAAA ? 'AAA' : passesAA ? 'AA' : 'FAIL',
    levelLarge: passesAAALarge ? 'AAA' : passesAALarge ? 'AA' : 'FAIL',
    rating,
  };
}

/**
 * Calculates contrast ratio and returns WCAG compliance information
 * Main function to use for checking color contrast
 * Uses webAbilityFrontend calculation method
 */
/**
 * Calculates contrast ratio and returns WCAG compliance information
 * Main function to use for checking color contrast
 * Uses webAbilityFrontend calculation method - 100% exact implementation
 */
export function getContrastResult(
  foreground: string,
  background: string,
): ContrastResult {
  // Use exact same calculation as webAbilityFrontend
  const ratio = calculateWCAG2Contrast(foreground, background);
  return checkWCAGCompliance(ratio);
}

/**
 * Formats contrast ratio for display
 */
export function formatContrastRatio(ratio: number | null): string {
  if (ratio === null) {
    return 'N/A';
  }
  return `${ratio.toFixed(2)}:1`;
}

/**
 * Gets a human-readable compliance status message
 */
export function getComplianceMessage(result: ContrastResult, isLargeText: boolean = false): string {
  if (result.ratio === null || result.ratio === 0) {
    return 'Invalid colors';
  }

  const level = isLargeText ? result.levelLarge : result.level;
  
  if (level === 'AAA') {
    return `WCAG ${level} ✓`;
  } else if (level === 'AA') {
    return `WCAG ${level} ✓`;
  } else {
    const required = isLargeText ? '3:1' : '4.5:1';
    return `WCAG AA requires ${required}`;
  }
}

