import { Switch } from '@mui/material';
import type React from 'react';
import { Colors, Toggles } from './editWidget_old';
import { ReactComponent as LogoIcon } from '@/assets/images/svg/logo.svg';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useSelector } from 'react-redux';
import { RootState } from '@/config/store';
import AccessibilityMenu from './MenuPreview_old';
import ColorPicker from '@/components/Common/ColorPicker';

interface CustomizeWidgetProps {
  colors: Colors;
  setColors: React.Dispatch<React.SetStateAction<Colors>>;
  toggles: Toggles;
  setToggles: React.Dispatch<React.SetStateAction<Toggles>>;
  font: string[];
  selectedFont: string;
  setSelectedFont: React.Dispatch<React.SetStateAction<string>>;
  DefaultColors: Colors;
  onSave?: () => void;
  onReset?: () => void;
  buttonDisable?: boolean;
  selectedSite?: string;
}

const switchSx = {
  '& .MuiSwitch-switchBase': { color: '#222D73' },
  '& .MuiSwitch-switchBase.Mui-checked': { color: '#145DA6' },
  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
    backgroundColor: '#82B2E7',
  },
  '& .MuiSwitch-switchBase:not(.Mui-checked) + .MuiSwitch-track': {
    backgroundColor: '#878993 !important',
    opacity: '1 !important',
  },
  '& .MuiSwitch-track': {
    backgroundColor: '#878993 !important',
    opacity: '1 !important',
  },
  '& .MuiSwitch-switchBase:focus-visible': { outline: 'none' },
  '& .MuiSwitch-switchBase.Mui-focusVisible': { outline: 'none' },
};

const CustomizeWidget: React.FC<CustomizeWidgetProps> = ({
  colors,
  setColors,
  toggles,
  setToggles,
  font,
  setSelectedFont,
  selectedFont,
  DefaultColors,
  onSave,
  onReset,
  buttonDisable = false,
}) => {
  const [activeTab, setActiveTab] = useState<'appearance' | 'preference'>(
    'appearance',
  );
  const [livePreview, setLivePreview] = useState(false);
  const previewSectionRef = useRef<HTMLDivElement>(null);
  const customizationSectionRef = useRef<HTMLDivElement>(null);
  const [previewHeight, setPreviewHeight] = useState<number | null>(null);

  const updateColor = (key: keyof Colors) => (color: string) => {
    setColors((prev) => ({ ...prev, [key]: color }));
  };

  const resetColor = (key: keyof Colors) => () => {
    setColors((prev) => ({ ...prev, [key]: DefaultColors[key] }));
  };

  const toggleFeatures = [
    { key: 'language', label: 'Language' },
    { key: 'darkMode', label: 'Dark Mode' },
    { key: 'screenReader', label: 'Screen Reader' },
    { key: 'readingGuide', label: 'Reading Guide' },
    { key: 'stopAnimations', label: 'Stop Animations' },
    { key: 'bigCursor', label: 'Big Cursor' },
    { key: 'voiceNavigation', label: 'Voice Navigation' },
    { key: 'darkContrast', label: 'Dark Contrast' },
    { key: 'lightContrast', label: 'Light Contrast' },
    { key: 'highContrast', label: 'High Contrast' },
    { key: 'highSaturation', label: 'High Saturation' },
    { key: 'lowSaturation', label: 'Low Saturation' },
    { key: 'monochrome', label: 'Monochrome' },
    { key: 'highlightLinks', label: 'Highlight Links' },
    { key: 'highlightTitle', label: 'Highlight title' },
    { key: 'dyslexiaFont', label: 'Dyslexia Font' },
    { key: 'letterSpacing', label: 'Letter Spacing' },
    { key: 'lineHeight', label: 'Line Height' },
    { key: 'fontWeight', label: 'Font Weight' },
    { key: 'motorImpaired', label: 'Motor Impaired' },
    { key: 'blind', label: 'Blind' },
    { key: 'dyslexia', label: 'Dyslexia' },
    { key: 'visuallyImpaired', label: 'Visually Impaired' },
    { key: 'cognitiveAndLearning', label: 'Cognitive & Learning' },
    { key: 'seizureAndEpileptic', label: 'Seizure & Epileptic' },
    { key: 'colorBlind', label: 'Color Blind' },
    { key: 'adhd', label: 'ADHD' },
  ];

  const colorPickers: { key: keyof Colors; label: string; description: string }[] = [
    { key: 'headerText', label: 'Header Text Color', description: 'Text color in the widget header' },
    { key: 'headerBg', label: 'Header BG Color', description: 'Background color for the header' },
    { key: 'headerControlsColor', label: 'Header Controls Color', description: 'Color for header control elements' },
    { key: 'footerText', label: 'Footer Text Color', description: 'Text color in the widget footer' },
    { key: 'footerBg', label: 'Footer BG Color', description: 'Background color for the footer' },
    { key: 'buttonText', label: 'Button Text Color', description: 'Text color for menu buttons' },
    { key: 'buttonBg', label: 'Button BG Color', description: 'Background color for menu buttons' },
    { key: 'widgetBtnColor', label: 'Widget Button Color', description: 'Primary color for the main widget button' },
    { key: 'menuBg', label: 'Menu Background Color', description: 'Background color for the menu panel' },
    { key: 'dropdownText', label: 'Dropdown Text Color', description: 'Text color in dropdown menus' },
    { key: 'dropdownBg', label: 'Dropdown BG Color', description: 'Background color for dropdown menus' },
    { key: 'widgetInnerText', label: 'Widget Inner Text Color', description: 'Default text color inside the widget' },
    { key: 'fontSizeMenuBg', label: 'Font Size Menu BG Color', description: 'Background color for the font size menu' },
    { key: 'fontSizeMenuText', label: 'Font Size Menu Text Color', description: 'Text color in the font size menu' },
    { key: 'fontSizeMenuButton', label: 'Font Size Menu Button Color', description: 'Button color in the font size menu' },
    { key: 'reportButtonsBgColor', label: 'Report Buttons BG Color', description: 'Background color for report buttons' },
    { key: 'reportButtonsTextColor', label: 'Report Buttons Text Color', description: 'Text color for report buttons' },
  ];

  const fileInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  const handleLogoReset = () => {
    setColors((prev) => ({ ...prev, logoImage: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (urlInputRef.current) urlInputRef.current.value = '';
    setIsFileInput(true);
    setIsUrlInput(true);
  };

  const [isFileInput, setIsFileInput] = useState(true);
  const [isUrlInput, setIsUrlInput] = useState(true);
  const [logoInput, setLogoInput] = useState('');
  const [accessibilityStatementLinkUrl, setAccessibilityStatementLinkUrl] =
    useState(colors.accessibilityStatementLinkUrl);
  const [logoUrl, setLogoUrl] = useState(colors.logoUrl);

  useEffect(() => {
    setAccessibilityStatementLinkUrl(colors.accessibilityStatementLinkUrl);
    setLogoUrl(colors.logoUrl);
  }, [colors.accessibilityStatementLinkUrl, colors.logoUrl]);

  // Measure preview section height and set as maxHeight for customization section
  useEffect(() => {
    if (!livePreview || !previewSectionRef.current) {
      setPreviewHeight(null);
      return;
    }

    const updateHeight = () => {
      if (previewSectionRef.current) {
        const height = previewSectionRef.current.offsetHeight;
        setPreviewHeight(height);
      }
    };

    // Initial measurement
    updateHeight();

    // Update on resize
    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(previewSectionRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [livePreview]);

  const isBase64 = (str: string) =>
    /^data:image\/(png|jpg|jpeg|gif|bmp);base64,/.test(str);
  const isValidUrl = (str: string) =>
    /^(http:\/\/|https:\/\/)([a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+)(\/[a-zA-Z0-9\-._~:?#[\]@!$&'()*+,;=]*)?$/.test(
      str,
    );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/png', 'image/svg+xml', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Only PNG, SVG, or WebP images are allowed.');
      e.target.value = '';
      return;
    }
    if (file.size > 76800) {
      toast.error('File size should not exceed 75 KB.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = (event.target?.result as string) || '';
      setLogoInput(base64String);
      setColors((prev) => ({ ...prev, logoImage: base64String }));
    };
    reader.readAsDataURL(file);
    setIsUrlInput(false);
    setIsFileInput(true);
  };

  const organization = useSelector(
    (state: RootState) => state.organization.data,
  );

  const saveResetButtons = (onSave && onReset) ? (
    <div className="flex flex-row justify-end gap-4 mt-8 px-4 pb-6 mb-4 save-reset-buttons">
      <button
        onClick={onReset}
        disabled={buttonDisable}
        className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-[#2E3A9E] disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
      >
        Reset
      </button>
      <button
        onClick={onSave}
        disabled={buttonDisable}
        className="px-6 py-2 border border-transparent rounded-md text-white focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-[#2E3A9E] disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
        style={{ backgroundColor: '#0052CC' }}
      >
        Save
      </button>
    </div>
  ) : null;

  return (
    <div>
      {/* Tabs - matches new widget */}
      <div className="px-6 pb-4">
        <div
          className="flex space-x-8 mt-4 widget-tabs-section"
          role="tablist"
        >
          <button
            onClick={() => setActiveTab('appearance')}
            role="tab"
            aria-selected={activeTab === 'appearance'}
            aria-controls="appearance-tabpanel"
            id="appearance-tab"
            tabIndex={0}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors appearance-tab focus:outline-none focus:ring-2 focus:ring-[#808EEB] focus:ring-offset-2 rounded-t ${
              activeTab === 'appearance'
                ? 'border-[#0F64F1] text-[#0F64F1] bg-[#E8F2FE]'
                : 'border-transparent text-[#666666] hover:text-[#4A4A4A]'
            }`}
          >
            Appearance
          </button>
          <button
            onClick={() => setActiveTab('preference')}
            role="tab"
            aria-selected={activeTab === 'preference'}
            aria-controls="preference-tabpanel"
            id="preference-tab"
            tabIndex={0}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors preference-tab focus:outline-none focus:ring-2 focus:ring-[#808EEB] focus:ring-offset-2 rounded-t ${
              activeTab === 'preference'
                ? 'border-[#0F64F1] text-[#0F64F1] bg-[#E8F2FE]'
                : 'border-transparent text-[#666666] hover:text-[#4A4A4A]'
            }`}
          >
            Preference
          </button>
        </div>
      </div>

      <div className="relative flex flex-col md:flex-row h-auto bg-[#ebeffd] border border-[#a3aef1] rounded-lg md:items-start">
        {/* Left Side - Settings */}
        <div
          ref={customizationSectionRef}
          className={`${
            livePreview ? 'w-full md:w-[40%] xl:w-2/3' : 'w-full'
          } p-3 sm:p-4 md:p-6 transition-all duration-300 flex flex-col widget-customization-section overflow-y-auto`}
          style={{ 
            height: livePreview ? 'auto' : '1000px',
            maxHeight: livePreview && previewHeight ? `${previewHeight}px` : livePreview ? '100%' : '1000px'
          }}
        >
          <div className="space-y-6">
            {activeTab === 'preference' && (
              <div
                id="preference-tabpanel"
                role="tabpanel"
                aria-labelledby="preference-tab"
                tabIndex={0}
              >
                <div className="px-2">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base sm:text-lg font-semibold text-[#333333]">
                      Live preview
                    </h2>
                    <Switch
                      checked={livePreview}
                      onChange={(e) => setLivePreview(e.target.checked)}
                      inputProps={{
                        'aria-label': 'Live preview',
                        role: 'switch',
                        'aria-checked': livePreview,
                      }}
                      sx={switchSx}
                    />
                  </div>
                </div>

                <h3 className="text-base md:text-lg font-semibold text-[#333333] mb-2 px-2">
                  Toggle Features
                </h3>
                <p
                  className="text-xs sm:text-sm md:text-sm mb-4 px-2"
                  style={{ color: '#6D6D6D' }}
                >
                  Toggle which accessibility features you want to show or hide
                </p>
                <div className="bg-[#ebeffd] border border-[#a3aef1] rounded-lg p-2 sm:p-3 md:p-4 toggle-features-panel">
                  <div className="space-y-3">
                    {toggleFeatures.map(({ key, label }) => (
                      <div
                        key={key}
                        className="bg-white rounded-lg border border-[#A2ADF3] p-3 sm:p-4 md:p-4"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-[#333333] text-sm md:text-base">
                            {label}
                          </span>
                          <Switch
                            checked={Boolean(toggles[key as keyof typeof toggles])}
                            onChange={(e) =>
                              setToggles((prev) => ({
                                ...prev,
                                [key]: e.target.checked,
                              }))
                            }
                            inputProps={{
                              'aria-label': label,
                              role: 'switch',
                              'aria-checked': Boolean(
                                toggles[key as keyof typeof toggles],
                              ),
                            }}
                            sx={switchSx}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {saveResetButtons}
              </div>
            )}

            {activeTab === 'appearance' && (
              <div
                id="appearance-tabpanel"
                role="tabpanel"
                aria-labelledby="appearance-tab"
                tabIndex={0}
              >
                <div className="px-2 live-preview-toggle">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base sm:text-lg font-semibold text-[#333333]">
                      Live preview
                    </h2>
                    <Switch
                      checked={livePreview}
                      onChange={(e) => setLivePreview(e.target.checked)}
                      inputProps={{
                        'aria-label': 'Live preview',
                        role: 'switch',
                        'aria-checked': livePreview,
                      }}
                      sx={switchSx}
                    />
                  </div>
                </div>

                {/* Color Customization - same ColorPicker component and layout as new widget */}
                <h3 className="text-base md:text-lg font-semibold text-[#333333] mb-2 px-2">
                  Color Customization
                </h3>
                <p
                  className="text-xs sm:text-sm md:text-sm mb-4 px-2"
                  style={{ color: '#6D6D6D' }}
                >
                  Customize the appearance and colors of your accessibility
                  widget to match your brand
                </p>
                <div className="bg-white rounded-lg shadow-sm border border-[#A2ADF3] p-3 sm:p-4 md:p-6 mb-4 color-customization-panel">
                  <div className="space-y-4">
                    {colorPickers.map(({ key, label, description }) => (
                      <ColorPicker
                        key={key}
                        label={label}
                        description={description}
                        value={String(colors[key] || DefaultColors[key] || '#000000')}
                        onChange={updateColor(key)}
                        onReset={resetColor(key)}
                      />
                    ))}
                  </div>
                </div>

                {/* Upload Widget Logo */}
                <div className="bg-white rounded-xl shadow-sm border border-[#A2ADF3] p-4 sm:p-5 md:p-6 mb-4">
                  <h3 className="text-lg font-semibold text-[#1a1a1a] mb-2">
                    Upload Widget Logo
                  </h3>
                  <p
                    className="text-sm mb-4"
                    style={{ color: '#666666' }}
                  >
                    Optimal dimensions: 200 × 50 pixels for best display quality
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    disabled={!isFileInput}
                    className="w-full p-2 border border-[#D1D5DB] rounded-lg mb-3 text-sm"
                    onChange={handleFileChange}
                  />
                  <input
                    type="text"
                    placeholder="Or enter image URL"
                    className="w-full p-2 border border-[#D1D5DB] rounded-lg mb-3 text-sm"
                    ref={urlInputRef}
                    disabled={!isUrlInput}
                    onChange={(e) => {
                      const url = e.target.value.trim();
                      if (url) setLogoInput(url);
                      setIsFileInput(false);
                    }}
                  />
                  <div className="mb-4">
                    {colors.logoImage.length ? (
                      <img
                        src={colors.logoImage}
                        alt="Logo Preview"
                        className="max-w-[198px] max-h-[47px] object-contain"
                      />
                    ) : organization?.logo_url ? (
                      <img
                        width={198}
                        height={47}
                        src={organization.logo_url}
                        alt={organization.name}
                      />
                    ) : (
                      <LogoIcon />
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleLogoReset}
                      className="px-4 py-2 bg-white border border-[#D1D5DB] text-[#374151] rounded-lg text-sm font-medium hover:bg-[#F9FAFB]"
                    >
                      Reset Logo
                    </button>
                    <button
                      onClick={() => {
                        if (isBase64(logoInput)) {
                          setColors((prev) => ({ ...prev, logoImage: logoInput }));
                          setIsFileInput(true);
                          setIsUrlInput(false);
                        } else if (isValidUrl(logoInput)) {
                          setColors((prev) => ({ ...prev, logoImage: logoInput }));
                          setIsUrlInput(true);
                          setIsFileInput(false);
                        } else if (logoInput) {
                          toast.error('Please provide a valid Image or URL.');
                        }
                      }}
                      className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                      style={{ backgroundColor: '#0052CC' }}
                    >
                      Set Logo
                    </button>
                  </div>
                </div>

                {/* Logo Link URL */}
                <div className="bg-white rounded-xl shadow-sm border border-[#A2ADF3] p-4 sm:p-5 md:p-6 mb-4">
                  <h3 className="text-lg font-semibold text-[#1a1a1a] mb-2">
                    Set Logo Link URL
                  </h3>
                  <input
                    type="text"
                    placeholder="Enter Logo Link URL"
                    className="w-full p-3 border border-[#D1D5DB] rounded-lg text-sm mb-4"
                    value={logoUrl}
                    onChange={(e) => {
                      const url = e.target.value.trim();
                      setLogoUrl(url);
                      setColors((prev) => ({ ...prev, logoUrl: url }));
                    }}
                  />
                  <button
                    onClick={() => {
                      setColors((prev) => ({ ...prev, logoUrl: DefaultColors.logoUrl }));
                      setLogoUrl(DefaultColors.logoUrl);
                    }}
                    className="px-4 py-2 bg-white border border-[#D1D5DB] text-[#374151] rounded-lg text-sm font-medium hover:bg-[#F9FAFB]"
                  >
                    Reset
                  </button>
                </div>

                {/* Accessibility Statement Link URL */}
                <div className="bg-white rounded-xl shadow-sm border border-[#A2ADF3] p-4 sm:p-5 md:p-6 mb-4">
                  <h3 className="text-lg font-semibold text-[#1a1a1a] mb-2">
                    Set Accessibility Statement Link URL
                  </h3>
                  <input
                    type="text"
                    placeholder="Enter Accessibility Statement Link URL"
                    className="w-full p-3 border border-[#D1D5DB] rounded-lg text-sm mb-4"
                    value={accessibilityStatementLinkUrl}
                    onChange={(e) => {
                      const url = e.target.value.trim();
                      setAccessibilityStatementLinkUrl(url);
                      setColors((prev) => ({
                        ...prev,
                        accessibilityStatementLinkUrl: url,
                      }));
                    }}
                  />
                  <button
                    onClick={() => {
                      setColors((prev) => ({
                        ...prev,
                        accessibilityStatementLinkUrl:
                          DefaultColors.accessibilityStatementLinkUrl,
                      }));
                      setAccessibilityStatementLinkUrl(
                        DefaultColors.accessibilityStatementLinkUrl,
                      );
                    }}
                    className="px-4 py-2 bg-white border border-[#D1D5DB] text-[#374151] rounded-lg text-sm font-medium hover:bg-[#F9FAFB]"
                  >
                    Reset
                  </button>
                </div>

                {/* Font Selection */}
                <div className="bg-white rounded-xl shadow-sm border border-[#A2ADF3] p-4 sm:p-5 md:p-6 mb-4">
                  <h3 className="text-lg font-semibold text-[#1a1a1a] mb-2">
                    Select Widget Font
                  </h3>
                  <select
                    className="w-full p-3 border border-[#D1D5DB] rounded-lg text-sm mb-4"
                    value={selectedFont}
                    onChange={(e) => setSelectedFont(e.target.value)}
                  >
                    <option value="auto">Auto</option>
                    <option value="'Times New Roman', serif">
                      'Times New Roman', serif
                    </option>
                    {font.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setSelectedFont('auto')}
                    className="px-4 py-2 bg-white border border-[#D1D5DB] text-[#374151] rounded-lg text-sm font-medium hover:bg-[#F9FAFB]"
                  >
                    Reset
                  </button>
                </div>

                {saveResetButtons}
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Live Preview (responsive for sm view ≤768px) */}
        {livePreview && (
          <>
            {/* Add responsive CSS overrides for MenuPreview_old grids on sm screens */}
            <style>{`
              @media (max-width: 768px) {
                /* CRITICAL: Override MenuPreview_old root div height and overflow */
                .widget-preview-responsive > div,
                .widget-preview-responsive > div.flex.flex-col,
                .widget-preview-responsive .h-\\[calc\\(100vh-2rem\\)\\] {
                  height: 600px !important;
                  max-height: 600px !important;
                  min-height: auto !important;
                  overflow-y: auto !important;
                  overflow-x: hidden !important;
                  display: flex !important;
                  flex-direction: column !important;
                  position: relative !important;
                }
                
                /* Ensure header is always first child and visible */
                .widget-preview-responsive > div > header:first-child {
                  order: -1 !important;
                  position: sticky !important;
                  top: 0 !important;
                  z-index: 100 !important;
                }
                
                /* Header responsive fixes - ensure proper display on sm screens */
                /* Override h-14 class and inline styles */
                .widget-preview-responsive header,
                .widget-preview-responsive header.h-14 {
                  padding: 0.5rem !important;
                  height: 2.5rem !important;
                  min-height: 2.5rem !important;
                  max-height: 2.5rem !important;
                  display: flex !important;
                  align-items: center !important;
                  justify-content: space-between !important;
                  gap: 0.5rem !important;
                  overflow: visible !important;
                  width: 100% !important;
                  box-sizing: border-box !important;
                  flex-shrink: 0 !important;
                  position: sticky !important;
                  top: 0 !important;
                  z-index: 10 !important;
                  /* Override inline styles */
                  padding-top: 0.5rem !important;
                  padding-bottom: 0.5rem !important;
                  padding-left: 0.5rem !important;
                  padding-right: 0.5rem !important;
                }
                /* Override h1 with text-lg class */
                .widget-preview-responsive header h1,
                .widget-preview-responsive header h1.text-lg {
                  font-size: 0.7rem !important;
                  line-height: 1rem !important;
                  font-weight: 600 !important;
                  flex: 1 1 auto !important;
                  min-width: 0 !important;
                  max-width: 60% !important;
                  overflow: hidden !important;
                  text-overflow: ellipsis !important;
                  white-space: nowrap !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  /* Override inline styles */
                  display: block !important;
                  visibility: visible !important;
                  opacity: 1 !important;
                }
                /* Override button container with gap-4 */
                .widget-preview-responsive header > div,
                .widget-preview-responsive header > div.flex.gap-4 {
                  gap: 0.25rem !important;
                  flex-shrink: 0 !important;
                  display: flex !important;
                  align-items: center !important;
                  justify-content: flex-end !important;
                  /* Override inline styles */
                  margin: 0 !important;
                  padding: 0 !important;
                }
                /* Override buttons with p-2 and rounded-full */
                .widget-preview-responsive header button,
                .widget-preview-responsive header button.p-2,
                .widget-preview-responsive header button.rounded-full {
                  padding: 0.25rem !important;
                  width: 1.5rem !important;
                  height: 1.5rem !important;
                  min-width: 1.5rem !important;
                  min-height: 1.5rem !important;
                  flex-shrink: 0 !important;
                  display: flex !important;
                  align-items: center !important;
                  justify-content: center !important;
                  box-sizing: border-box !important;
                  /* Override inline styles */
                  margin: 0 !important;
                }
                /* Override all SVG icons in header */
                .widget-preview-responsive header button svg,
                .widget-preview-responsive header svg {
                  width: 0.75rem !important;
                  height: 0.75rem !important;
                  flex-shrink: 0 !important;
                  display: block !important;
                }
                /* Override w-6 and h-6 classes in header */
                .widget-preview-responsive header .w-6,
                .widget-preview-responsive header button .w-6 {
                  width: 0.75rem !important;
                  height: 0.75rem !important;
                }
                .widget-preview-responsive header .h-6,
                .widget-preview-responsive header button .h-6 {
                  height: 0.75rem !important;
                  width: 0.75rem !important;
                }
                
                /* Ensure content area below header scrolls properly */
                .widget-preview-responsive .flex-grow {
                  flex: 1 1 0% !important;
                  min-height: 0 !important;
                  overflow-y: auto !important;
                }
                
                /* Override 3-column grids to 2 columns on sm */
                .widget-preview-responsive .grid-cols-3 {
                  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                }
                /* Override 2-column grids to 1 column on sm */
                .widget-preview-responsive .grid-cols-2 {
                  grid-template-columns: repeat(1, minmax(0, 1fr)) !important;
                }
                /* Reduce text sizes */
                .widget-preview-responsive .text-xl {
                  font-size: 1rem !important;
                  line-height: 1.5rem !important;
                }
                .widget-preview-responsive .text-lg {
                  font-size: 0.875rem !important;
                  line-height: 1.25rem !important;
                }
                /* Reduce gaps */
                .widget-preview-responsive .gap-4 {
                  gap: 0.5rem !important;
                }
                /* Reduce padding */
                .widget-preview-responsive .p-4 {
                  padding: 0.75rem !important;
                }
                /* Reduce icon sizes */
                .widget-preview-responsive .w-12,
                .widget-preview-responsive .h-12 {
                  width: 2rem !important;
                  height: 2rem !important;
                }
                .widget-preview-responsive .w-14,
                .widget-preview-responsive .h-14 {
                  width: 2.5rem !important;
                  height: 2.5rem !important;
                }
                .widget-preview-responsive .w-8,
                .widget-preview-responsive .h-8 {
                  width: 1.5rem !important;
                  height: 1.5rem !important;
                }
                
                /* Ensure proper width constraint */
                .widget-preview-responsive {
                  max-width: 320px !important;
                  width: 100% !important;
                }
              }
            `}</style>
            <div 
              ref={previewSectionRef}
              className="w-full md:w-[60%] xl:w-1/3 p-2 sm:p-2 md:p-6 transition-all duration-300 widget-preview-section flex flex-col"
            >
              <div
                className="rounded-lg shadow-sm flex flex-col sm:overflow-hidden md:overflow-hidden h-full"
                style={{ backgroundColor: '#ebeffd' }}
              >
                {/* Responsive wrapper for sm view with proper constraints */}
                {/* On sm (≤768px): constrain width to 320px max, height to 600px */}
                {/* On md (≥768px): let MenuPreview_old use its natural dimensions */}
                <div className="w-full sm:max-w-[320px] md:max-w-none mx-auto sm:mx-auto md:mx-0 h-full flex flex-col">
                  {/* Constrain MenuPreview_old on sm screens with responsive class */}
                  <div 
                    className="widget-preview-responsive sm:h-[600px] md:h-full flex-1"
                    style={{
                      width: '100%',
                      overflow: 'hidden'
                    }}
                  >
                    <AccessibilityMenu
                      selectedFont={selectedFont}
                      colors={colors}
                      toggles={toggles}
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CustomizeWidget;
