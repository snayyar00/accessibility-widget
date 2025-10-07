import React from 'react';
import { ChevronDown } from 'lucide-react';

interface ColorPickerProps {
  label: string;
  description: string;
  value: string;
  onChange: (color: string) => void;
  onReset: () => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({
  label,
  description,
  value,
  onChange,
  onReset,
}) => {
  // Ensure value is a valid hex color
  const isValidHex = (color: string) => {
    return /^#([0-9A-F]{3}){1,2}$/i.test(color);
  };

  const safeValue = isValidHex(value) ? value : '#000000';

  return (
    <div className="flex flex-col sm:flex-col md:flex-row md:items-center md:justify-between w-full py-3 gap-3 sm:gap-3 md:gap-0">
      {/* Left side - Label and Description */}
      <div className="flex flex-col flex-1 sm:pr-0 md:pr-4">
        <span className="text-sm font-medium text-gray-700 mb-1">{label}</span>
        <span className="text-xs text-gray-500 leading-relaxed">
          {description}
        </span>
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
