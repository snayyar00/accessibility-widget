import React from 'react';
import { ChevronDown, AlertCircle, CheckCircle2 } from 'lucide-react';
import { 
  getContrastResult, 
  formatContrastRatio, 
  getComplianceMessage,
  calculateWCAG2Contrast,
  getWCAG2Rating 
} from '@/utils/contrastRatio';

interface ColorPickerProps {
  label: string;
  description: string;
  value: string;
  onChange: (color: string) => void;
  onReset: () => void;
  // Optional: Background color to check contrast against (when value is foreground/text)
  backgroundColor?: string;
  // Optional: Foreground color to check contrast against (when value is background)
  // If provided, contrast will be calculated as foregroundColor on value
  foregroundColor?: string;
  // Optional: Whether this is for large text (18pt+ or 14pt+ bold)
  isLargeText?: boolean;
}

const ColorPicker: React.FC<ColorPickerProps> = ({
  label,
  description,
  value,
  onChange,
  onReset,
  backgroundColor,
  foregroundColor,
  isLargeText = false,
}) => {
  // Ensure value is a valid hex color
  const isValidHex = (color: string) => {
    return /^#([0-9A-F]{3}){1,2}$/i.test(color);
  };

  const safeValue = isValidHex(value) ? value : '#000000';
  const safeBackgroundColor = backgroundColor && isValidHex(backgroundColor) ? backgroundColor : null;
  const safeForegroundColor = foregroundColor && isValidHex(foregroundColor) ? foregroundColor : null;

  // Calculate contrast ratio
  // If foregroundColor is provided, check foregroundColor (text) on value (background)
  // Otherwise, check value (text) on backgroundColor (background)
  const contrastResult = safeForegroundColor
    ? getContrastResult(safeForegroundColor, safeValue)
    : safeBackgroundColor
    ? getContrastResult(safeValue, safeBackgroundColor)
    : null;

  // Determine if contrast passes WCAG requirements
  const passesWCAG = contrastResult
    ? (isLargeText ? contrastResult.passesAALarge : contrastResult.passesAA)
    : null;

  const complianceMessage = contrastResult
    ? getComplianceMessage(contrastResult, isLargeText)
    : null;

  return (
    <div className="flex flex-col sm:flex-col md:flex-row md:items-center md:justify-between w-full py-3 gap-3 sm:gap-3 md:gap-0">
      {/* Left side - Label and Description */}
      <div className="flex flex-col flex-1 sm:pr-0 md:pr-4">
        <span className="text-sm font-medium text-gray-700 mb-1">{label}</span>
        <span className="text-xs text-gray-500 leading-relaxed mb-2">
          {description}
        </span>
        {/* Contrast Ratio Display */}
        {contrastResult && (
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1.5">
              {passesWCAG ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600" />
              )}
              <span
                className={`text-xs font-medium ${
                  passesWCAG ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {formatContrastRatio(contrastResult.ratio)}
              </span>
            </div>
            <span
              className={`text-xs font-medium ${
                passesWCAG ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {complianceMessage}
            </span>
            {isLargeText && (
              <span className="text-xs text-gray-400">(Large text)</span>
            )}
          </div>
        )}
      </div>

      {/* Right side - Color picker control */}
      <div className="flex items-center gap-3 sm:justify-start md:justify-end">
        <div className="relative">
          {/* Hidden color input */}
          <input
            type="color"
            value={safeValue}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            aria-label={`Select color for ${label.toLowerCase()}`}
          />

          {/* Visible control - container fits to content */}
          <div className="inline-flex items-center bg-white border border-[#A7B0FF] rounded-lg px-2 py-2 cursor-pointer hover:border-[#8B9AFF] transition-all duration-200 shadow-sm h-10">
            {/* Color preview square - matches Figma specs exactly */}
            <div
              className="w-8 h-8 rounded-lg mr-2 flex-shrink-0"
              style={{ backgroundColor: safeValue }}
              aria-hidden="true"
            />

            {/* Chevron down icon */}
            <ChevronDown className="w-4 h-4 text-[#5C6BC0] flex-shrink-0" />
          </div>
        </div>

        {/* Reset button */}
        <button
          onClick={onReset}
          className="px-3 py-2 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
          aria-label={`Reset ${label.toLowerCase()} to default`}
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default ColorPicker;
