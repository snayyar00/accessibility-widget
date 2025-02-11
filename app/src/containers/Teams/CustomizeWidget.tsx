import { Switch } from '@mui/material';
import type React from 'react';

export interface Colors {
  headerText: string;
  headerBg: string;
  footerText: string;
  footerBg: string;
  buttonText: string;
  buttonBg: string;
  menuBg: string;
  dropdownText: string;
  dropdownBg: string;
  widgetInnerText: string;
  fontSizeMenuBg: string;
  fontSizeMenuText: string;
  fontSizeMenuButton: string;
  customizationMenuInnerBg: string;
}

export interface Toggles {
  darkMode: boolean;
  screenReader: boolean;
  readingGuide: boolean;
  stopAnimations: boolean;
  bigCursor: boolean;
  voiceNavigation: boolean;
  darkContrast: boolean;
  lightContrast: boolean;
  highContrast: boolean;
  highSaturation: boolean;
  lowSaturation: boolean;
  monochrome: boolean;
  highlightLinks: boolean;
  highlightTitle: boolean;
  dyslexiaFont: boolean;
  letterSpacing: boolean;
  lineHeight: boolean;
  fontWeight: boolean;
  motorImpaired: boolean;
  blind: boolean;
  dyslexia: boolean;
  visuallyImpaired: boolean;
  cognitiveAndLearning: boolean;
  seizureAndEpileptic: boolean;
  colorBlind: boolean;
  adhd: boolean;
}

interface CustomizeWidgetProps {
  colors: Colors;
  setColors: React.Dispatch<React.SetStateAction<Colors>>;
  toggles: Toggles;
  setToggles: React.Dispatch<React.SetStateAction<Toggles>>;
  font: string[];
  selectedFont: string;
  setSelectedFont: React.Dispatch<React.SetStateAction<string>>;
  DefaultColors: Colors;
}

const CustomizeWidget: React.FC<CustomizeWidgetProps> = ({
  colors,
  setColors,
  toggles,
  setToggles,
  font,
  setSelectedFont,
  selectedFont,
  DefaultColors,
}) => {
  const updateColor = (key: keyof Colors) => (color: string) => {
    setColors((prev) => ({ ...prev, [key]: color }));
  };

  const resetColor = (key: keyof Colors) => () => {
    setColors((prev) => ({ ...prev, [key]: DefaultColors[key] }));
  };

  const toggleFeatures = [
    { key: 'darkMode', label: 'Toggle Dark Mode' },
    { key: 'screenReader', label: 'Toggle Screen Reader' },
    { key: 'readingGuide', label: 'Toggle Reading Guide' },
    { key: 'stopAnimations', label: 'Toggle Stop Animations' },
    { key: 'bigCursor', label: 'Toggle Big Cursor' },
    { key: 'voiceNavigation', label: 'Toggle Voice Navigation' },
    { key: 'darkContrast', label: 'Toggle Dark Contrast' },
    { key: 'lightContrast', label: 'Toggle Light Contrast' },
    { key: 'highContrast', label: 'Toggle High Contrast' },
    { key: 'highSaturation', label: 'Toggle High Saturation' },
    { key: 'lowSaturation', label: 'Toggle Low Saturation' },
    { key: 'monochrome', label: 'Toggle Monochrome' },
    { key: 'highlightLinks', label: 'Toggle Highlight Links' },
    { key: 'highlightTitle', label: 'Toggle Highlight title' },
    { key: 'dyslexiaFont', label: 'Toggle Dyslexia Font' },
    { key: 'letterSpacing', label: 'Toggle Letter Spacing' },
    { key: 'lineHeight', label: 'Toggle Line Height' },
    { key: 'fontWeight', label: 'Toggle Font Weight' },
    { key: 'motorImpaired', label: 'Toggle Motor Impaired' },
    { key: 'blind', label: 'Toggle Blind' },
    { key: 'dyslexia', label: 'Toggle Dyslexia' },
    { key: 'visuallyImpaired', label: 'Toggle Visually Impaired' },
    { key: 'cognitiveAndLearning', label: 'Toggle Cognitive & Learning' },
    { key: 'seizureAndEpileptic', label: 'Toggle Seizure & Epileptic' },
    { key: 'colorBlind', label: 'Toggle Color Blind' },
    { key: 'adhd', label: 'Toggle ADHD' },
  ];

  const colorPickers = [
    { key: 'headerText', label: 'Header Text Color' },
    { key: 'headerBg', label: 'Header BG Color' },
    { key: 'footerText', label: 'Footer Text Color' },
    { key: 'footerBg', label: 'Footer BG Color' },
    { key: 'buttonText', label: 'Button Text Color' },
    { key: 'buttonBg', label: 'Button BG Color' },
    { key: 'menuBg', label: 'Menu Background Color' },
    { key: 'dropdownText', label: 'Dropdown Text Color' },
    { key: 'dropdownBg', label: 'Dropdown BG Color' },
    { key: 'widgetInnerText', label: 'Widget Inner Text Color' },
    { key: 'fontSizeMenuBg', label: 'Font Size Menu BG Color' },
    { key: 'fontSizeMenuText', label: 'Font Size Menu Text Color' },
    { key: 'fontSizeMenuButton', label: 'Font Size Menu Button Color' },
  ];
  return (
    <div className="w-full max-w-[500px] mx-auto bg-[#eff1f5] font-serif text-base sm:text-lg flex flex-col h-[calc(100vh-2rem)] md:h-screen overflow-hidden">
      <header className="flex items-center justify-between py-7 px-3 sm:px-4 h-12 sm:h-14 bg-[#0848ca] text-white sticky top-0 z-20">
        <h1 className="text-base sm:text-lg font-semibold">Customize Widget</h1>
      </header>

      <div className="flex-grow overflow-y-auto">
        <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
          <div className="bg-white p-3 sm:p-4 rounded-xl">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">
              Widget Color Adjustments
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4 mt-4">
              {colorPickers.map(({ key, label }) => (
                <div key={key} className="flex flex-col items-center">
                  <label
                    className="text-center text-sm sm:text-lg mb-1"
                    htmlFor={key}
                  >
                    {label}
                  </label>
                  <div className="relative w-12 h-12">
                    <input
                      type="color"
                      id={key}
                      value={String(colors[key as keyof typeof colors])}
                      onChange={(e) =>
                        updateColor(key as keyof Colors)(e.target.value)
                      }
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div
                      className="w-12 h-12 rounded-full border border-gray-300"
                      style={{
                        backgroundColor: colors[key as keyof Colors],
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      resetColor(key as keyof Colors)();
                    }}
                    className="mt-2 px-2 py-1 text-sm border border-gray-300 rounded"
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-3 sm:p-4 rounded-xl">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">
              Select Widget Font
            </h2>
            <select
              className="w-full p-2 border rounded mb-3 sm:mb-4 text-sm sm:text-base"
              value={selectedFont}
              onChange={(e) => setSelectedFont(e.target.value)}
            >
              <option value="'Times New Roman', serif">
                'Times New Roman', serif
              </option>
              {font.map((fonts) => (
                <option key={fonts} value={fonts}>
                  {fonts}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                setSelectedFont("'Times New Roman', serif");
              }}
              className="px-3 py-2 sm:px-4 sm:py-2 bg-[#0948c9] text-white rounded text-sm sm:text-base"
            >
              Reset
            </button>
          </div>

          <div className="bg-white p-3 sm:p-4 rounded-xl">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">
              Toggle Features
            </h2>
            <div className="space-y-3 sm:space-y-4">
              {toggleFeatures.map(({ key, label }) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-4"
                >
                  <span className="text-sm sm:text-lg flex-1">{label}</span>
                  <Switch
                    checked={Boolean(toggles[key as keyof typeof toggles])}
                    onChange={(e) => {
                      setToggles((prev: any) => ({
                        ...prev,
                        [key]: e.target.checked,
                      }));
                    }}
                    color="primary"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomizeWidget;
