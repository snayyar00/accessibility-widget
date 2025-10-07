import { Switch } from '@mui/material';
import type React from 'react';
import { Colors, Toggles } from './editWidget';
import { ReactComponent as LogoIcon } from '@/assets/images/svg/logo.svg';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useSelector } from 'react-redux';
import { RootState } from '@/config/store';
import {
  ChevronDown,
  ChevronUp,
  Monitor,
  Smartphone,
  Link,
  HelpCircle,
} from 'lucide-react';
import AccessibilityMenu from './MenuPreview';
import ColorPicker from '@/components/Common/ColorPicker';

interface CustomizeWidgetProps {
  colors: Colors;
  setColors: React.Dispatch<React.SetStateAction<Colors>>;
  colorMode: 'light' | 'dark';
  setColorMode: React.Dispatch<React.SetStateAction<'light' | 'dark'>>;
  toggles: Toggles;
  setToggles: React.Dispatch<React.SetStateAction<Toggles>>;
  font: string[];
  selectedFont: string;
  setSelectedFont: React.Dispatch<React.SetStateAction<string>>;
  DefaultColors: Colors;
  onSave: () => void;
  onReset: () => void;
  buttonDisable: boolean;
}

const CustomizeWidget: React.FC<CustomizeWidgetProps> = ({
  colors,
  setColors,
  colorMode,
  setColorMode,
  toggles,
  setToggles,
  font,
  setSelectedFont,
  selectedFont,
  DefaultColors,
  onSave,
  onReset,
  buttonDisable,
}) => {
  const [activeTab, setActiveTab] = useState<'appearance' | 'preference'>(
    'appearance',
  );
  const [livePreview, setLivePreview] = useState(false);
  const [position, setPosition] = useState('bottom-left');
  const [desktopOffset, setDesktopOffset] = useState({
    horizontal: 24,
    vertical: 24,
  });
  const [mobileOffset, setMobileOffset] = useState({
    horizontal: 4,
    vertical: 4,
  });
  const [linkedOffsets, setLinkedOffsets] = useState(true);
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    accessibilityProfiles: true,
    contentAdjustments: false,
    colorAdjustments: false,
    tools: false,
  });

  const updateColor = (key: keyof Colors) => (color: string) => {
    setColors((prev) => ({ ...prev, [key]: color }));
  };

  const resetColor = (key: keyof Colors) => () => {
    setColors((prev) => ({ ...prev, [key]: DefaultColors[key] }));
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const toggleFeatures = [
    { key: 'language', label: 'Toggle Language' },
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
    {
      key: 'allIconsAndText',
      label: 'Text and Icon Colors',
      description:
        'Change the color of all text and icons displayed throughout the widget',
    },
    {
      key: 'toggleIconColor',
      label: 'Theme Switch Icon',
      description:
        'Color of the sun/moon icon in the light/dark mode toggle button',
    },
    {
      key: 'toggleBgUnchecked',
      label: 'Theme Toggle Background ',
      description: "Background color of the theme switch when it's turned off",
    },
    {
      key: 'selectedItems',
      label: 'Active Button Highlight',
      description:
        'Color that highlights numbered buttons when they are actively selected',
    },
    {
      key: 'headerText',
      label: 'Widget Header Text',
      description:
        'Color of the title and text displayed at the header of the widget',
    },
    {
      key: 'cardTitles',
      label: 'Headings',
      description: 'Color of the heading text',
    },
    {
      key: 'headerIcons',
      label: 'Widget Header Icons',
      description:
        'Color of the icons displayed in the header section of the widget',
    },
    {
      key: 'headerBackground',
      label: 'Header Background color',
      description: 'Background color of the top section of the widget',
    },
    {
      key: 'footerBackground',
      label: 'Footer Background color',
      description: 'Background color of the bottom section of the widget',
    },
    {
      key: 'headerButtonsBorder',
      label: 'Header Button Outlines',
      description:
        'Color of the border lines around buttons in the header section',
    },
    {
      key: 'allBorderLines',
      label: 'Border Lines ',
      description:
        'Color of all separator lines and borders throughout the widget main panel',
    },
    {
      key: 'numberedButtons',
      label: 'Numbered Adjustment Buttons',
      description:
        'Color of numeric increment buttons used to adjust feature levels',
    },
    {
      key: 'widgetBackground',
      label: 'Main Widget Panel Background',
      description: "Background color of the main widget panel when it's opened",
    },
    {
      key: 'dropdownBackgrounds',
      label: 'Dropdown Menu Backgrounds',
      description:
        'Background color of language and widget position dropdown selection menus in the widget',
    },
    {
      key: 'allHoverStates',
      label: 'Mouse Hover Highlight',
      description:
        'Color that appears when you move your mouse over clickable items',
    },
    {
      key: 'selectedLanguage',
      label: 'Selected Dropdown Options',
      description:
        'Color that highlights your chosen language and widget position in dropdown menus',
    },
    {
      key: 'progressBars',
      label: 'Cycling Button Progress Bars',
      description:
        'Color of bars that displays the current state of cycling buttons',
    },
    {
      key: 'reportIssueText',
      label: 'Issue Report Form Labels',
      description:
        'Color of text labels in the form where users report accessibility issues',
    },
    {
      key: 'reportIssueInputText',
      label: 'Issue Report Input Fields',
      description:
        'Text color inside the input boxes when users type their feedback',
    },
    {
      key: 'reportIssueButtons',
      label: 'Issue Report Button Text',
      description: 'Color of text on buttons in the report issue section',
    },
    {
      key: 'reportIssueButtonBackground',
      label: 'Issue Report Button Fill',
      description: 'Background color of buttons in the report issue section',
    },
    {
      key: 'reportIssueTextboxBackground',
      label: 'Issue Report Text Box Fill',
      description:
        'Background color of the text input areas where users write their feedback',
    },
    {
      key: 'reportIssueCardDropdownBackground',
      label: 'Issue Report Panel Background',
      description:
        'Background color of the entire report issue panel and its dropdown menus',
    },
  ];

  const fileInputRef = useRef(null); // Create a ref for the file input
  const urlInputRef = useRef(null); // Create a ref for the URL input

  const handleReset = () => {
    setColors((prevColors) => ({
      ...prevColors, // Keep all the previous state values
      logoImage: '', // Reset the logoImage to an empty string
    }));

    // Clear the file input using the ref
    if (fileInputRef.current) {
      (fileInputRef.current as any).value = ''; // Clear the file input field
    }

    // Clear the URL input field using the ref
    if (urlInputRef.current) {
      (urlInputRef.current as any).value = ''; // Clear the URL input field
    }
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
  const isBase64 = (str: any) => {
    const regex = /^data:image\/(png|jpg|jpeg|gif|bmp);base64,/;
    return regex.test(str);
  };

  // Function to validate URL
  const isValidUrl = (str: any) => {
    const regex =
      /^(http:\/\/|https:\/\/)([a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+)(\/[a-zA-Z0-9\-._~:?#\[\]@!$&'()*+,;=]*)?$/;
    return regex.test(str);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      // Validate file type
      const validTypes = ['image/png', 'image/svg+xml', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast.error('Only PNG, SVG, or WebP images are allowed.');
        e.target.value = ''; // Reset the input field to remove the file name
        return; // Prevent the file from being processed if the type is invalid
      }

      // Validate file size (should not exceed 10 KB)
      if (file.size > 76800) {
        toast.error('File size should not exceed 75 KB.');
        e.target.value = ''; // Reset the input field to remove the file name
        return; // Prevent the file from being processed if the size is too large
      }

      // If valid, read the file as base64
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64String = event.target?.result as string;
        setLogoInput(base64String); // Store the base64 data
        setColors((prev) => ({
          ...prev,
          logoImage: base64String, // Update the logoImage state
        }));
      };
      reader.readAsDataURL(file); // Only proceed if the file passed validation

      // Disable the URL input once file input is used
      setIsUrlInput(false);
      setIsFileInput(true);
    }
  };

  const organization = useSelector(
    (state: RootState) => state.organization.data,
  );

  return (
    <div className="w-full min-h-screen">
      {/* Header */}
      <div className=" px-6 pb-4">
        {/* Tabs */}
        <div className="flex space-x-8 mt-4">
          <button
            onClick={() => setActiveTab('appearance')}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'appearance'
                ? 'border-[#4285F4] text-[#4285F4]'
                : 'border-transparent text-[#666666] hover:text-[#4A4A4A]'
            }`}
          >
            Appearance
          </button>
          <button
            onClick={() => setActiveTab('preference')}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'preference'
                ? 'border-[#4285F4] text-[#4285F4]'
                : 'border-transparent text-[#666666] hover:text-[#4A4A4A]'
            }`}
          >
            Preference
          </button>
        </div>
      </div>

      <div className="relative flex flex-col md:flex-row h-auto md:h-[calc(100vh-200px)] bg-[#ebeffd] border border-[#a3aef1] rounded-lg ">
        {/* Left Side - Settings */}
        <div
          className={`${
            livePreview ? 'w-full md:w-1/2' : 'w-full'
          } p-3 md:p-6 transition-all duration-300 flex flex-col `}
        >
          <div className="flex-1 space-y-6">
            {activeTab === 'preference' && (
              <>
                {/* Live Preview Section */}
                <div className="px-2">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base sm:text-lg font-semibold text-[#333333]">
                      Live preview
                    </h3>
                    <Switch
                      checked={livePreview}
                      onChange={(e) => setLivePreview(e.target.checked)}
                      color="primary"
                    />
                  </div>
                </div>

                {/* Toggle Features */}
                <h3 className="text-base md:text-lg font-semibold text-[#333333] mb-2 px-2">
                  Toggle Features
                </h3>
                <p className="text-xs md:text-sm text-[#757575] mb-4 px-2">
                  Toggle which accessibility features you want to show or hide
                </p>
                <div
                  className="bg-[#ebeffd] border border-[#a3aef1] rounded-lg p-2 md:p-4 max-h-[calc(100vh-400px)] overflow-y-auto hide-scrollbar"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  <div className="space-y-3">
                    {/* Language */}
                    <div className="bg-white rounded-lg border border-[#A2ADF3] p-3 md:p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-[#333333] text-sm md:text-base">
                          Language
                        </span>
                        <Switch
                          checked={Boolean(toggles.language)}
                          onChange={(e) =>
                            setToggles((prev) => ({
                              ...prev,
                              language: e.target.checked,
                            }))
                          }
                          color="primary"
                        />
                      </div>
                    </div>

                    {/* Oversize widget */}
                    <div className="bg-white rounded-lg border border-[#A2ADF3] p-3 md:p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-[#333333] text-sm md:text-base">
                          Oversize widget
                        </span>
                        <Switch
                          checked={Boolean(toggles.oversizeWidget)}
                          onChange={(e) =>
                            setToggles((prev) => ({
                              ...prev,
                              oversizeWidget: e.target.checked,
                            }))
                          }
                          color="primary"
                        />
                      </div>
                    </div>

                    {/* Accessibility Profiles */}
                    <div className="bg-white rounded-lg border border-[#A2ADF3] p-3 md:p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium text-[#333333] text-sm md:text-base">
                          Accessibility Profiles
                        </span>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={Boolean(
                              toggles.motorImpaired ||
                                toggles.blind ||
                                toggles.colorBlind ||
                                toggles.dyslexia ||
                                toggles.visuallyImpaired ||
                                toggles.cognitiveAndLearning ||
                                toggles.seizureAndEpileptic ||
                                toggles.adhd,
                            )}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setToggles((prev) => ({
                                ...prev,
                                motorImpaired: checked,
                                blind: checked,
                                colorBlind: checked,
                                dyslexia: checked,
                                visuallyImpaired: checked,
                                cognitiveAndLearning: checked,
                                seizureAndEpileptic: checked,
                                adhd: checked,
                              }));
                            }}
                            color="primary"
                          />
                          <button
                            onClick={() =>
                              toggleSection('accessibilityProfiles')
                            }
                            className="p-1"
                          >
                            {expandedSections.accessibilityProfiles ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {expandedSections.accessibilityProfiles && (
                        <div className="space-y-2 pl-4">
                          {[
                            { key: 'motorImpaired', label: 'Motor Impaired' },
                            { key: 'blind', label: 'Blind' },
                            { key: 'colorBlind', label: 'Color Blind' },
                            { key: 'dyslexia', label: 'Dyslexia' },
                            {
                              key: 'visuallyImpaired',
                              label: 'Visually Impaired',
                            },
                            {
                              key: 'cognitiveAndLearning',
                              label: 'Cognitive & Learning',
                            },
                            {
                              key: 'seizureAndEpileptic',
                              label: 'Seizure & Epileptic',
                            },
                            { key: 'adhd', label: 'ADHD' },
                          ].map(({ key, label }) => (
                            <div
                              key={key}
                              className="flex items-center justify-between"
                            >
                              <span className="text-sm text-[#4A4A4A]">
                                {label}
                              </span>
                              <Switch
                                checked={Boolean(toggles[key as keyof Toggles])}
                                onChange={(e) =>
                                  setToggles((prev) => ({
                                    ...prev,
                                    [key]: e.target.checked,
                                  }))
                                }
                                color="primary"
                                size="small"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 2 Content Adjustments */}
                    <div className="bg-white rounded-lg border border-[#A2ADF3] p-3 md:p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium text-[#333333] text-sm md:text-base">
                          Content Adjustments
                        </span>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={Boolean(
                              toggles.fontSize ||
                                toggles.highlightTitle ||
                                toggles.highlightLinks ||
                                toggles.dyslexiaFont ||
                                toggles.letterSpacing ||
                                toggles.lineHeight ||
                                toggles.fontWeight,
                            )}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setToggles((prev) => ({
                                ...prev,
                                fontSize: checked,
                                highlightTitle: checked,
                                highlightLinks: checked,
                                dyslexiaFont: checked,
                                letterSpacing: checked,
                                lineHeight: checked,
                                fontWeight: checked,
                              }));
                            }}
                            color="primary"
                          />
                          <button
                            onClick={() => toggleSection('contentAdjustments')}
                            className="p-1"
                          >
                            {expandedSections.contentAdjustments ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {expandedSections.contentAdjustments && (
                        <div className="space-y-2 pl-4">
                          {[
                            { key: 'fontSize', label: 'Font size' },
                            { key: 'highlightTitle', label: 'Highlight Title' },
                            { key: 'highlightLinks', label: 'Highlight Links' },
                            { key: 'dyslexiaFont', label: 'Dyslexia Font' },
                            { key: 'letterSpacing', label: 'Letter Spacing' },
                            { key: 'lineHeight', label: 'Line Height' },
                            { key: 'fontWeight', label: 'Font Weight' },
                          ].map(({ key, label }) => (
                            <div
                              key={key}
                              className="flex items-center justify-between"
                            >
                              <span className="text-sm text-[#4A4A4A]">
                                {label}
                              </span>
                              <Switch
                                checked={Boolean(toggles[key as keyof Toggles])}
                                onChange={(e) =>
                                  setToggles((prev) => ({
                                    ...prev,
                                    [key]: e.target.checked,
                                  }))
                                }
                                color="primary"
                                size="small"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 3 Color Adjustments */}
                    <div className="bg-white rounded-lg border border-[#A2ADF3] p-3 md:p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium text-[#333333] text-sm md:text-base">
                          Color Adjustments
                        </span>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={Boolean(
                              toggles.darkContrast ||
                                toggles.lightContrast ||
                                toggles.highContrast ||
                                toggles.highSaturation ||
                                toggles.lowSaturation ||
                                toggles.monochrome ||
                                toggles.textColor ||
                                toggles.titleColor ||
                                toggles.backgroundColor,
                            )}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setToggles((prev) => ({
                                ...prev,
                                darkContrast: checked,
                                lightContrast: checked,
                                highContrast: checked,
                                highSaturation: checked,
                                lowSaturation: checked,
                                monochrome: checked,
                                textColor: checked,
                                titleColor: checked,
                                backgroundColor: checked,
                              }));
                            }}
                            color="primary"
                          />
                          <button
                            onClick={() => toggleSection('colorAdjustments')}
                            className="p-1"
                          >
                            {expandedSections.colorAdjustments ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {expandedSections.colorAdjustments && (
                        <div className="space-y-2 pl-4">
                          {[
                            { key: 'darkContrast', label: 'Contrast' },
                            { key: 'highSaturation', label: 'Saturation' },
                            { key: 'monochrome', label: 'Monochrome' },
                            { key: 'textColor', label: 'Text Color' },
                            { key: 'titleColor', label: 'Title Color' },
                            {
                              key: 'backgroundColor',
                              label: 'Background Color',
                            },
                          ].map(({ key, label }) => (
                            <div
                              key={key}
                              className="flex items-center justify-between"
                            >
                              <span className="text-sm text-[#4A4A4A]">
                                {label}
                              </span>
                              <Switch
                                checked={Boolean(toggles[key as keyof Toggles])}
                                onChange={(e) =>
                                  setToggles((prev) => ({
                                    ...prev,
                                    [key]: e.target.checked,
                                  }))
                                }
                                color="primary"
                                size="small"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 4 Tools */}
                    <div className="bg-white rounded-lg border border-[#A2ADF3] p-3 md:p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium text-[#333333] text-sm md:text-base">
                          Tools
                        </span>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={Boolean(
                              toggles.pageStructure ||
                                toggles.keyboardNavigation ||
                                toggles.darkMode ||
                                toggles.screenReader ||
                                toggles.readingGuide ||
                                toggles.stopAnimations ||
                                toggles.bigCursor ||
                                toggles.voiceNavigation,
                            )}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setToggles((prev) => ({
                                ...prev,
                                pageStructure: checked,
                                keyboardNavigation: checked,
                                darkMode: checked,
                                screenReader: checked,
                                readingGuide: checked,
                                stopAnimations: checked,
                                bigCursor: checked,
                                voiceNavigation: checked,
                              }));
                            }}
                            color="primary"
                          />
                          <button
                            onClick={() => toggleSection('tools')}
                            className="p-1"
                          >
                            {expandedSections.tools ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {expandedSections.tools && (
                        <div className="space-y-2 pl-4">
                          {[
                            { key: 'pageStructure', label: 'Page Structure' },
                            {
                              key: 'keyboardNavigation',
                              label: 'Keyboard Navigation',
                            },
                            { key: 'darkMode', label: 'Dark Mode' },
                            { key: 'screenReader', label: 'Screen Reader' },
                            { key: 'readingGuide', label: 'Reading Guide' },
                            { key: 'stopAnimations', label: 'Stop Animations' },
                            { key: 'bigCursor', label: 'Big Cursor' },
                            {
                              key: 'voiceNavigation',
                              label: 'Voice Navigation',
                            },
                          ].map(({ key, label }) => (
                            <div
                              key={key}
                              className="flex items-center justify-between"
                            >
                              <span className="text-sm text-[#4A4A4A]">
                                {label}
                              </span>
                              <Switch
                                checked={Boolean(toggles[key as keyof Toggles])}
                                onChange={(e) =>
                                  setToggles((prev) => ({
                                    ...prev,
                                    [key]: e.target.checked,
                                  }))
                                }
                                color="primary"
                                size="small"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Widget position */}
                    <div className="bg-white rounded-lg border border-[#A2ADF3] p-3 md:p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-[#333333] text-sm md:text-base">
                          Widget position
                        </span>
                        <Switch
                          checked={Boolean(toggles.widgetPosition)}
                          onChange={(e) =>
                            setToggles((prev) => ({
                              ...prev,
                              widgetPosition: e.target.checked,
                            }))
                          }
                          color="primary"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Save and Reset Buttons */}
                  <div className="flex flex-row justify-end gap-4 mt-4 px-4 pb-6 mb-4">
                    <button
                      onClick={onReset}
                      disabled={buttonDisable}
                      className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4285F4] disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
                    >
                      Reset
                    </button>
                    <button
                      onClick={onSave}
                      disabled={buttonDisable}
                      className="px-6 py-2 border border-transparent rounded-md text-white bg-[#4285F4] hover:bg-[#3367D6] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4285F4] disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'appearance' && (
              <>
                {/* Live Preview Section */}
                <div className="px-2">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base sm:text-lg font-semibold text-[#333333]">
                      Live preview
                    </h3>
                    <Switch
                      checked={livePreview}
                      onChange={(e) => setLivePreview(e.target.checked)}
                      color="primary"
                    />
                  </div>
                </div>

                {/* Color Customization Section */}
                <h3 className="text-base md:text-lg font-semibold text-[#333333] mb-2 px-2">
                  Color Customization
                </h3>
                <p className="text-xs md:text-sm text-[#757575] mb-4 px-2">
                  Customize the appearance and colors of your accessibility
                  widget to match your brand
                </p>

                <div
                  className="bg-[#ebeffd] border border-[#a3aef1] rounded-lg p-2 md:p-4 max-h-[calc(100vh-400px)] overflow-y-auto hide-scrollbar"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {/* Widget Button Color */}
                  <div className="bg-white rounded-lg shadow-sm border border-[#A2ADF3] p-4 md:p-6 mb-4">
                    <ColorPicker
                      label="Widget Button Color"
                      description="Primary color for the main widget button"
                      value={colors.widgetBtnColor}
                      onChange={updateColor('widgetBtnColor')}
                      onReset={resetColor('widgetBtnColor')}
                    />
                  </div>

                  {/* Color Mode Toggle */}
                  <div className="bg-white rounded-lg shadow-sm border border-[#A2ADF3] p-4 md:p-6 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-[#333333]">
                        Chose your mode
                      </h3>
                      <div className="relative w-32">
                        <select
                          value={colorMode}
                          onChange={(e) =>
                            setColorMode(e.target.value as 'light' | 'dark')
                          }
                          className="appearance-none bg-white border border-[#E0E0E0] rounded-lg px-4 py-2 pr-8 text-sm text-[#333333] focus:outline-none focus:border-[#4285F4] cursor-pointer w-full"
                        >
                          <option value="light">Light</option>
                          <option value="dark">Dark</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                          <ChevronDown className="w-4 h-4 text-[#4285F4]" />
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-[#757575]">
                      Change the theme colour of your widget interface
                    </p>
                  </div>

                  {/* Widget Color Adjustments */}
                  <div className="bg-white rounded-lg shadow-sm border border-[#A2ADF3] p-4 md:p-6 mb-4">
                    <h3 className="text-lg font-semibold text-[#333333] mb-2">
                      Widget Color Adjustments
                      <span className="ml-2 text-sm font-normal text-[#757575]">
                        ({colorMode === 'light' ? 'Light' : 'Dark'} Mode)
                      </span>
                    </h3>
                    <p className="text-sm text-[#757575] mb-6">
                      Customize colors for {colorMode} mode. Changes are saved
                      separately for each mode.
                    </p>
                    <div className="space-y-4">
                      {colorPickers.map(({ key, label, description }) => {
                        const colorValue = colors[key as keyof typeof colors];
                        const defaultValue =
                          DefaultColors[key as keyof typeof DefaultColors];
                        return (
                          <ColorPicker
                            key={key}
                            label={label}
                            description={description}
                            value={colorValue || defaultValue || '#000000'}
                            onChange={updateColor(key as keyof Colors)}
                            onReset={resetColor(key as keyof Colors)}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Upload Widget Logo */}
                  <div className="bg-white rounded-lg shadow-sm border border-[#A2ADF3] p-4 md:p-6 mb-4">
                    <h3 className="text-lg font-semibold text-[#333333] mb-2">
                      Upload Widget Logo
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      <strong>Optimal dimensions:</strong> 200 × 50 pixels for
                      best display quality
                    </p>

                    {/* File upload */}
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      disabled={!isFileInput}
                      className="w-full p-2 border rounded mb-3 text-sm"
                      onChange={handleFileChange}
                    />

                    {/* URL input */}
                    <div className="flex items-center mb-3">
                      <input
                        type="text"
                        placeholder="Or enter image URL"
                        className="w-full p-2 border rounded text-sm"
                        ref={urlInputRef}
                        disabled={!isUrlInput}
                        onChange={(e) => {
                          const url = e.target.value.trim();
                          if (url) {
                            setLogoInput(url);
                          }
                          setIsFileInput(false);
                        }}
                      />
                    </div>

                    {/* Displaying the logo */}
                    <div className="mb-4">
                      {colors.logoImage.length ? (
                        <img
                          src={
                            colors.logoImage.length
                              ? colors.logoImage
                              : (LogoIcon as any)
                          }
                          alt="Logo Preview"
                          className="w-24 h-24 object-contain"
                        />
                      ) : (
                        <>
                          {organization?.logo_url ? (
                            <img
                              width={198}
                              height={47}
                              src={organization.logo_url}
                              alt={organization.name}
                            />
                          ) : (
                            <LogoIcon />
                          )}
                        </>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleReset}
                        className="px-3 py-2 bg-[#4285F4] text-white rounded text-sm hover:bg-[#3367D6]"
                      >
                        Reset
                      </button>
                      <button
                        onClick={() => {
                          if (isBase64(logoInput)) {
                            setColors((prev) => ({
                              ...prev,
                              logoImage: logoInput,
                            }));
                            setIsFileInput(true);
                            setIsUrlInput(false);
                          } else if (isValidUrl(logoInput)) {
                            setColors((prev) => ({
                              ...prev,
                              logoImage: logoInput,
                            }));
                            setIsUrlInput(true);
                            setIsFileInput(false);
                          } else {
                            toast.error('Please provide a valid Image or URL.');
                          }
                        }}
                        className="px-3 py-2 bg-[#4285F4] text-white rounded text-sm hover:bg-[#3367D6]"
                      >
                        Set Logo
                      </button>
                    </div>
                  </div>

                  {/* Set Logo Link URL */}
                  <div className="bg-white rounded-lg shadow-sm border border-[#A2ADF3] p-4 md:p-6 mb-4">
                    <h3 className="text-lg font-semibold text-[#333333] mb-4">
                      Set Logo Link URL
                    </h3>
                    <div className="flex items-center mb-4">
                      <input
                        type="text"
                        placeholder="Enter Logo Link URL"
                        className="w-full p-2 border rounded text-sm"
                        value={logoUrl}
                        onChange={(e) => {
                          const url = e.target.value.trim();
                          if (url) {
                            setColors((prev) => ({
                              ...prev,
                              logoUrl: url,
                            }));
                          }
                          setLogoUrl(url);
                        }}
                      />
                    </div>
                    <button
                      onClick={() => {
                        setColors((prev) => ({
                          ...prev,
                          logoUrl: DefaultColors.logoUrl,
                        }));
                        setLogoUrl(DefaultColors.logoUrl);
                      }}
                      className="px-3 py-2 bg-[#4285F4] text-white rounded text-sm hover:bg-[#3367D6]"
                    >
                      Reset
                    </button>
                  </div>

                  {/* Set Accessibility Statement Link URL */}
                  <div className="bg-white rounded-lg shadow-sm border border-[#A2ADF3] p-4 md:p-6 mb-8">
                    <h3 className="text-lg font-semibold text-[#333333] mb-4">
                      Set Accessibility Statement Link URL
                    </h3>
                    <div className="flex items-center mb-4">
                      <input
                        type="text"
                        placeholder="Enter Accessibility Statement Link URL"
                        className="w-full p-2 border rounded text-sm"
                        value={accessibilityStatementLinkUrl}
                        onChange={(e) => {
                          const url = e.target.value.trim();
                          if (url) {
                            setColors((prev) => ({
                              ...prev,
                              accessibilityStatementLinkUrl: url,
                            }));
                          }
                          setAccessibilityStatementLinkUrl(url);
                        }}
                      />
                    </div>
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
                      className="px-3 py-2 bg-[#4285F4] text-white rounded text-sm hover:bg-[#3367D6]"
                    >
                      Reset
                    </button>
                  </div>

                  {/* Select Widget Font */}
                  <div className="bg-white rounded-lg shadow-sm border border-[#A2ADF3] p-4 md:p-6 mb-8">
                    <h3 className="text-lg font-semibold text-[#333333] mb-4">
                      Select Widget Font
                    </h3>
                    <select
                      className="w-full p-2 border rounded mb-4 text-sm"
                      value={selectedFont}
                      onChange={(e) => setSelectedFont(e.target.value)}
                    >
                      <option value="auto">Auto</option>
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
                        setSelectedFont('auto');
                      }}
                      className="px-3 py-2 bg-[#4285F4] text-white rounded text-sm hover:bg-[#3367D6]"
                    >
                      Reset
                    </button>
                  </div>

                  {/* Save and Reset Buttons */}
                  <div className="flex flex-row justify-end gap-4 mt-8 px-4 pb-6 mb-4">
                    <button
                      onClick={onReset}
                      disabled={buttonDisable}
                      className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4285F4] disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
                    >
                      Reset
                    </button>
                    <button
                      onClick={onSave}
                      disabled={buttonDisable}
                      className="px-6 py-2 border border-transparent rounded-md text-white bg-[#4285F4] hover:bg-[#3367D6] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4285F4] disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Side - Widget Preview (Only visible when live preview is on) */}
        {livePreview && (
          <div className="w-full md:w-1/2 p-3 md:p-6 transition-all duration-300 ">
            <div className="bg-white rounded-lg shadow-sm border border-[#E0E0E0] p-4 md:p-6 h-[500px] md:h-full">
              <div className="border border-[#E0E0E0] rounded-lg p-4 bg-[#F8F9FA] h-full overflow-auto">
                <AccessibilityMenu
                  selectedFont={selectedFont}
                  colors={colors}
                  toggles={toggles}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomizeWidget;
